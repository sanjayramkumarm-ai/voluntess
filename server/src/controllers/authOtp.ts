import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { z } from "zod";
import admin from "firebase-admin";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import User from "../models/User";
import AuthCode from "../models/AuthCode";
import {
  OTP_TTL_MS,
  RESEND_COOLDOWN_MS,
  MAX_ATTEMPTS,
  generateCode,
  hashCode,
  safeEqual,
  sendEmailCode,
} from "../services/otp";

const sign = (u: any) =>
  jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET as string, {
    expiresIn: "7d",
  });

const publicUser = (u: any) => ({
  id: u._id,
  name: u.name,
  role: u.role,
  email: u.email,
  profilePhoto: u.profilePhoto || "",
});

const session = (u: any) => ({ token: sign(u), user: publicUser(u) });

const randomPasswordHash = () =>
  bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

type SendResult =
  | { ok: true }
  | { ok: false; reason: "cooldown"; wait: number }
  | { ok: false; reason: "send" };

async function sendCode(email: string, name: string): Promise<SendResult> {
  const existing = await AuthCode.findOne({ key: email, purpose: "email" });
  if (existing) {
    const last = existing.lastSentAt ? new Date(existing.lastSentAt).getTime() : 0;
    const wait = RESEND_COOLDOWN_MS - (Date.now() - last);
    if (wait > 0) return { ok: false, reason: "cooldown", wait: Math.ceil(wait / 1000) };
  }

  const code = generateCode();
  await AuthCode.findOneAndUpdate(
    { key: email, purpose: "email" },
    {
      codeHash: hashCode(email, code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      attempts: 0,
      lastSentAt: new Date(),
    },
    { upsert: true }
  );

  try {
    await sendEmailCode(email, name, code);
    return { ok: true };
  } catch (e) {
    console.error("Email send failed:", (e as Error).message);
    return { ok: false, reason: "send" };
  }
}

const reg = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8, "Password needs 8+ characters").max(100),
  role: z.enum(["volunteer", "ngo"]),
});

export const register = async (req: Request, res: Response) => {
  const d = reg.parse(req.body);
  const email = d.email.toLowerCase();
  const hash = await bcrypt.hash(d.password, 12);

  const existing = await User.findOne({ email });
  if (existing && existing.emailVerified !== false) {
    return res
      .status(409)
      .json({ message: "An account with this email already exists. Please log in." });
  }

  if (existing) {
    // Unverified account: let the person start again with new details
    existing.name = d.name;
    existing.role = d.role;
    existing.password = hash;
    await existing.save();
  } else {
    await User.create({
      name: d.name,
      email,
      password: hash,
      role: d.role,
      emailVerified: false,
    });
  }

  const sent = await sendCode(email, d.name);
  if (!sent.ok && sent.reason === "send") {
    return res
      .status(502)
      .json({ message: "Account created, but the code email could not be sent. Tap Resend." , needsVerification: true, email });
  }

  res.status(201).json({ needsVerification: true, email });
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { email, code } = z
    .object({
      email: z.string().trim().email(),
      code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
    })
    .parse(req.body);
  const key = email.toLowerCase();

  const rec = await AuthCode.findOne({ key, purpose: "email" });
  if (!rec || new Date(rec.expiresAt).getTime() < Date.now()) {
    return res.status(400).json({ message: "This code has expired. Request a new one." });
  }
  if ((rec.attempts ?? 0) >= MAX_ATTEMPTS) {
    return res.status(429).json({ message: "Too many wrong attempts. Request a new code." });
  }
  if (!safeEqual(rec.codeHash, hashCode(key, code))) {
    rec.attempts = (rec.attempts ?? 0) + 1;
    await rec.save();
    return res.status(400).json({ message: "Incorrect code. Please try again." });
  }

  const user = await User.findOne({ email: key });
  if (!user) return res.status(400).json({ message: "Account not found." });

  user.emailVerified = true;
  await user.save();
  await AuthCode.deleteOne({ _id: rec._id });

  res.json(session(user));
};

export const resendCode = async (req: Request, res: Response) => {
  const { email } = z.object({ email: z.string().trim().email() }).parse(req.body);
  const key = email.toLowerCase();

  const user = await User.findOne({ email: key });
  if (user && user.emailVerified === false) {
    const r = await sendCode(key, user.name);
    if (!r.ok && r.reason === "cooldown") {
      return res
        .status(429)
        .json({ message: `Please wait ${r.wait}s before requesting another code.`, wait: r.wait });
    }
    if (!r.ok) {
      return res.status(502).json({ message: "Could not send the email. Please try again." });
    }
  }
  // Same answer either way so nobody can probe which emails exist
  res.json({ message: "If this account needs verification, a new code has been sent." });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = z
    .object({ email: z.string().trim().email(), password: z.string().min(1) })
    .parse(req.body);

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Wrong email or password" });
  }

  if (user.emailVerified === false) {
    await sendCode(user.email, user.name); // respects the resend cooldown
    return res.status(403).json({
      message: "Please verify your email first. We sent you a code.",
      code: "EMAIL_NOT_VERIFIED",
      email: user.email,
    });
  }

  res.json(session(user));
};

const googleClient = new OAuth2Client();

export const googleLogin = async (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ message: "Google sign-in is not configured yet." });
  }

  const d = z
    .object({
      idToken: z.string().min(20),
      role: z.enum(["volunteer", "ngo"]).optional(),
    })
    .parse(req.body);

  let payload: TokenPayload | undefined;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: d.idToken, audience: clientId });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ message: "Google sign-in failed. Please try again." });
  }

  if (!payload || !payload.email || !payload.email_verified || !payload.sub) {
    return res.status(401).json({ message: "Your Google email is not verified." });
  }

  const email = payload.email.toLowerCase();
  const found = await User.findOne({ $or: [{ googleId: payload.sub }, { email }] });

  const user =
    found ??
    (await User.create({
      name: payload.name || email.split("@")[0],
      email,
      password: await randomPasswordHash(),
      role: d.role || "volunteer",
      googleId: payload.sub,
      emailVerified: true,
    }));

  if (found) {
    let dirty = false;
    if (!found.googleId) {
      found.googleId = payload.sub;
      dirty = true;
    }
    if (found.emailVerified === false) {
      found.emailVerified = true; // Google already verified this email
      dirty = true;
    }
    if (dirty) await found.save();
  }

  res.json(session(user));
};

export const phoneLogin = async (req: Request, res: Response) => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    return res.status(503).json({ message: "Phone sign-in is not configured yet." });
  }

  const d = z
    .object({
      idToken: z.string().min(20),
      name: z.string().trim().min(2).max(80).optional(),
      role: z.enum(["volunteer", "ngo"]).optional(),
    })
    .parse(req.body);

  let phone: string | undefined;
  try {
    if (!admin.apps.length) admin.initializeApp({ projectId });
    const decoded = await admin.auth().verifyIdToken(d.idToken);
    phone = decoded.phone_number;
  } catch {
    return res.status(401).json({ message: "Phone verification failed or expired. Try again." });
  }
  if (!phone) {
    return res.status(401).json({ message: "No verified phone number found." });
  }

  let user = await User.findOne({ phone });
  if (!user) {
    if (!d.name) {
      return res.status(404).json({
        message: "No account for this number. Use Join free to sign up.",
        code: "PHONE_NOT_REGISTERED",
      });
    }
    user = await User.create({
      name: d.name,
      // Phone-only accounts get a placeholder email (the schema requires one)
      email: `${phone.replace("+", "")}@phone.voluntess.invalid`,
      password: await randomPasswordHash(),
      role: d.role || "volunteer",
      phone,
      emailVerified: true,
    });
  }

  res.json(session(user));
};