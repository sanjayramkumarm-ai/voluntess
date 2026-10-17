import crypto from "crypto";
import nodemailer from "nodemailer";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_ATTEMPTS = 5;

export const generateCode = () =>
  crypto.randomInt(0, 1000000).toString().padStart(6, "0");

export const hashCode = (key: string, code: string) =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET || "dev-secret")
    .update(`${key}:${code}`)
    .digest("hex");

export const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT || 587);
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export async function sendEmailCode(to: string, name: string, code: string) {
  const t = getTransporter();
  if (!t) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email service is not configured");
    }
    // Development only: show the code in the server terminal
    console.log(`[DEV] Verification code for ${to}: ${code}`);
    return;
  }
  await t.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `${code} is your Voluntess verification code`,
    text: `Hi ${name},\n\nYour Voluntess verification code is ${code}.\nIt expires in 10 minutes. If you did not sign up, ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px">
      <h2 style="margin:0 0 8px">Verify your email</h2>
      <p style="color:#4b5563">Hi ${esc(name)}, enter this code to finish creating your Voluntess account:</p>
      <p style="font-size:34px;font-weight:700;letter-spacing:8px;margin:20px 0">${code}</p>
      <p style="color:#6b7280;font-size:13px">This code expires in 10 minutes. If you did not sign up, you can ignore this email.</p>
    </div>`,
  });
}