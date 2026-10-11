import { Request, Response } from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { z } from "zod";
import Application from "../models/Application";
import Opportunity from "../models/Opportunity";
import Completion from "../models/Completion";
import Certificate from "../models/Certificate";
import Attendance from "../models/Attendance";
import CheckinToken from "../models/CheckinToken";
import CheckinAttempt from "../models/CheckinAttempt";
import User from "../models/User";
import Notification from "../models/Notification";

const MIN_MINUTES = Math.max(1, Number(process.env.CERT_MIN_MINUTES) || 15);
const MAX_MINUTES = Math.max(MIN_MINUTES, Number(process.env.CERT_MAX_MINUTES) || 960);
const BEFORE_H = Number(process.env.CHECKIN_BEFORE_HOURS) || 12;
const AFTER_H = Number(process.env.CHECKIN_AFTER_HOURS) || 36;
const RETRY_MS = 2 * 60 * 1000;
const MIN_STAY_MS = 60 * 1000;
const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;

export const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => String(req.user?.id || req.user?._id || "anonymous"),
  message: { message: "Too many attempts. Wait a minute and try again." },
});

// ---------- helpers ----------
const p = (v: any) => String(Array.isArray(v) ? v[0] : v ?? "");
const oid = (v: any) => mongoose.isValidObjectId(v);
const fail = (res: Response, code: number, message: string, extra?: any) => res.status(code).json({ message, ...(extra || {}) });
function me(req: Request) {
  const u = (req as any).user;
  return { id: String(u?.id || u?._id || ""), role: String(u?.role || "") };
}
const hist = (by: string, action: string, details?: any) => ({ at: new Date(), by, action, details });
const histC = (by: string, action: string, fromStatus?: string, toStatus?: string, details?: any) => ({ at: new Date(), by, action, fromStatus, toStatus, details });

function venueOf(o: any) {
  const l = o?.location;
  if (!l) return "";
  if (typeof l === "string") return l;
  return [l.name, l.address, l.city].filter(Boolean).join(", ");
}

function secret() {
  const s = process.env.CHECKIN_SECRET || process.env.JWT_SECRET;
  if (!s) throw new Error("CHECKIN_SECRET is not set");
  return s;
}
const tokenFor = (oppId: string, version: number) =>
  crypto.createHmac("sha256", secret()).update(`checkin:${oppId}:${version}`).digest("base64url").slice(0, 32);
const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex");
function checkinUrl(token: string) {
  const base = (process.env.PUBLIC_APP_URL || process.env.CLIENT_URL || "").replace(/\/+$/, "");
  if (!base) throw new Error("PUBLIC_APP_URL is not set");
  return `${base}/checkin/${token}`;
}
function expiryFor(opp: any) {
  const base = Math.max(Date.now(), opp?.date ? new Date(opp.date).getTime() : 0);
  return new Date(base + AFTER_H * 3600 * 1000);
}
const tokenState = (doc: any) =>
  doc.revokedAt ? "revoked" : new Date(doc.expiresAt).getTime() < Date.now() ? "expired" : "active";

async function ensureToken(opp: any) {
  let doc: any = await CheckinToken.findOne({ opportunity: opp._id });
  if (!doc) {
    const token = tokenFor(String(opp._id), 1);
    try {
      doc = await CheckinToken.create({
        opportunity: opp._id,
        ngo: opp.organizer,
        version: 1,
        tokenHash: hashToken(token),
        expiresAt: expiryFor(opp),
        history: [{ at: new Date(), by: opp.organizer, action: "created" }],
      });
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
      doc = await CheckinToken.findOne({ opportunity: opp._id });
    }
  }
  if (opp.status === "cancelled" && !doc.revokedAt) {
    doc.revokedAt = new Date();
    doc.history.push({ at: new Date(), by: opp.organizer, action: "revoked_event_cancelled" });
    await doc.save();
  }
  return doc;
}

async function record(a: { type: string; severity: "info" | "review"; message: string; opportunity?: any; volunteer?: any; application?: any; dedupe?: boolean }) {
  try {
    if (a.dedupe !== false && a.volunteer && a.opportunity) {
      const dup = await CheckinAttempt.exists({
        volunteer: a.volunteer,
        opportunity: a.opportunity,
        type: a.type,
        createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
      });
      if (dup) return;
    }
    await CheckinAttempt.create({
      type: a.type,
      severity: a.severity,
      message: a.message,
      opportunity: a.opportunity || null,
      volunteer: a.volunteer || null,
      application: a.application || null,
    });
  } catch (error) {
    console.error("Attempt log failed:", error);
  }
}

async function notify(recipient: any, type: string, title: string, message: string, application: any, opportunity: any) {
  try {
    await Notification.create({ recipient, type, title, message, relatedApplication: application, relatedOpportunity: opportunity });
  } catch (error) {
    console.error("Notification failed:", error);
  }
}

const hasValidCert = async (application: any) => Boolean(await Certificate.exists({ application, verificationStatus: "valid" }));

async function overlapsOther(volunteer: any, exceptId: any, start: Date, end: Date) {
  return Boolean(
    await Attendance.exists({
      volunteer,
      _id: { $ne: exceptId },
      checkInAt: { $lt: end },
      $or: [{ checkOutAt: { $gt: start } }, { checkOutAt: null }],
    })
  );
}

const attDto = (a: any, certificateId?: string | null) => ({
  _id: a._id,
  opportunityId: a.opportunity,
  title: a.opportunityTitle || "",
  checkInAt: a.checkInAt,
  checkOutAt: a.checkOutAt || null,
  status: a.status,
  verification: a.verification,
  provisionalMinutes: a.provisionalMinutes || 0,
  approvedMinutes: a.approvedMinutes || 0,
  reviewReason: a.reviewReason || "",
  flags: a.flags || [],
  via: a.via,
  certificateId: certificateId || null,
});

// ---------- scan evaluation ----------
type Ctx =
  | { ok: false; code: number; reason: string; message: string }
  | { ok: true; user: { id: string; role: string }; opp: any; app: any };

async function noteInvalid(userId: string) {
  const recent = await CheckinAttempt.countDocuments({
    volunteer: userId || null,
    type: "invalid_token",
    createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
  });
  await record({ type: "invalid_token", severity: recent >= 4 ? "review" : "info", message: "An unrecognised check-in code was scanned.", volunteer: userId || null, dedupe: false });
}

async function evaluate(req: Request): Promise<Ctx> {
  const user = me(req);
  const raw = p(req.params.token);
  const invalid: Ctx = { ok: false, code: 404, reason: "invalid_token", message: "This isn't a valid Voluntess check-in code." };

  if (!TOKEN_RE.test(raw)) {
    await noteInvalid(user.id);
    return invalid;
  }
  const tok: any = await CheckinToken.findOne({ tokenHash: hashToken(raw) }).lean();
  if (!tok) {
    await noteInvalid(user.id);
    return invalid;
  }
  const opp: any = await Opportunity.findById(tok.opportunity).lean();
  if (!opp) return invalid;

  if (tok.revokedAt) {
    await record({ type: "revoked_token", severity: "info", message: "A withdrawn QR code was scanned.", opportunity: opp._id, volunteer: user.id });
    return { ok: false, code: 410, reason: "revoked", message: "This QR code was withdrawn by the organiser. Ask them for the current one." };
  }
  if (opp.status === "cancelled") {
    return { ok: false, code: 410, reason: "cancelled", message: "This event has been cancelled." };
  }
  if (new Date(tok.expiresAt).getTime() < Date.now()) {
    await record({ type: "expired_token", severity: "info", message: "An expired QR code was scanned.", opportunity: opp._id, volunteer: user.id });
    return { ok: false, code: 410, reason: "expired", message: "This QR code has expired. Ask the organiser for a new one." };
  }
  if (user.role !== "volunteer") {
    return { ok: false, code: 403, reason: "not_volunteer", message: "Only volunteer accounts can check in. Organisers record attendance from the Attendance page." };
  }

  const app: any = await Application.findOne({ opportunity: opp._id, volunteer: user.id }).lean();
  if (!app) {
    await record({ type: "no_application", severity: "review", message: "A user with no application scanned this event's QR code.", opportunity: opp._id, volunteer: user.id });
    return { ok: false, code: 403, reason: "no_application", message: "You haven't applied to this event." };
  }
  if (app.status === "pending") {
    await record({ type: "application_pending", severity: "info", message: "A volunteer with a pending application tried to check in.", opportunity: opp._id, volunteer: user.id, application: app._id });
    return { ok: false, code: 403, reason: "pending", message: "Your application for this event is still pending. You can check in once the organiser approves it." };
  }
  if (app.status === "rejected" || app.status === "withdrawn") {
    await record({ type: `application_${app.status}`, severity: "review", message: `A volunteer whose application is ${app.status} tried to check in.`, opportunity: opp._id, volunteer: user.id, application: app._id });
    return {
      ok: false,
      code: 403,
      reason: app.status,
      message: app.status === "rejected" ? "Your application wasn't approved, so you can't check in to this event." : "You withdrew your application for this event.",
    };
  }
  if (app.status !== "accepted") return { ok: false, code: 403, reason: "not_approved", message: "You are not approved for this event." };

  return { ok: true, user, opp, app };
}

// ---------- core operations ----------
type Result = { code: number; att?: any; duplicate?: boolean; reason?: string; message?: string };

async function performCheckIn(app: any, opp: any, by: string, via: "qr" | "manual", opts: { skipWindow?: boolean; note?: string }): Promise<Result> {
  const now = new Date();

  const existing: any = await Attendance.findOne({ application: app._id }).lean();
  if (existing) {
    if (now.getTime() - new Date(existing.checkInAt).getTime() < RETRY_MS) return { code: 200, att: existing, duplicate: true };
    await record({ type: "duplicate_checkin", severity: "info", message: "A second check-in was attempted.", opportunity: opp._id, volunteer: app.volunteer, application: app._id });
    return {
      code: 409,
      att: existing,
      reason: "already_checked_in",
      message: existing.checkOutAt ? "You have already checked in and out of this event." : "You are already checked in. Check out when you leave.",
    };
  }

  if (!opts.skipWindow && opp.date) {
    const d = new Date(opp.date).getTime();
    if (now.getTime() < d - BEFORE_H * 3600 * 1000 || now.getTime() > d + AFTER_H * 3600 * 1000) {
      await record({ type: "outside_window", severity: "info", message: "Check-in was attempted outside the event window.", opportunity: opp._id, volunteer: app.volunteer, application: app._id });
      return { code: 400, reason: "outside_window", message: "Check-in is only open around the event date." };
    }
  }

  const active: any = await Attendance.findOne({ volunteer: app.volunteer, status: "checked_in" }).lean();
  if (active) {
    await record({ type: "multiple_active", severity: "review", message: "A check-in was attempted while still checked in to another event.", opportunity: opp._id, volunteer: app.volunteer, application: app._id });
    return { code: 409, reason: "active_elsewhere", message: "This volunteer is still checked in to another event. Check out there first." };
  }

  const [vol, ngo]: any[] = await Promise.all([
    User.findById(app.volunteer).select("name").lean(),
    User.findById(opp.organizer).select("name").lean(),
  ]);

  let att: any;
  try {
    att = await Attendance.create({
      volunteer: app.volunteer,
      opportunity: opp._id,
      application: app._id,
      ngo: opp.organizer,
      volunteerName: vol?.name || "",
      opportunityTitle: opp.title || "",
      ngoName: ngo?.name || "",
      checkInAt: now,
      status: "checked_in",
      verification: "none",
      via,
      flags: via === "manual" ? ["manual_entry"] : [],
      history: [hist(by, "checked_in", { via, note: opts.note || undefined })],
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      const ex: any = await Attendance.findOne({ application: app._id }).lean();
      if (ex) return { code: 200, att: ex, duplicate: true };
      return { code: 409, reason: "active_elsewhere", message: "This volunteer is still checked in to another event." };
    }
    throw error;
  }

  await notify(app.volunteer, "attendance_recorded", "Checked In", `Your check-in for "${opp.title}" was recorded.`, app._id, opp._id);
  return { code: 201, att: att.toObject() };
}

async function performCheckOut(att: any, opp: any, by: string, via: "qr" | "manual", note?: string): Promise<Result> {
  const now = new Date();

  if (att.checkOutAt) {
    if (now.getTime() - new Date(att.checkOutAt).getTime() < RETRY_MS) return { code: 200, att, duplicate: true };
    await record({ type: "duplicate_checkout", severity: "info", message: "A second check-out was attempted.", opportunity: opp._id, volunteer: att.volunteer, application: att.application });
    return { code: 409, att, reason: "already_checked_out", message: "You have already checked out of this event." };
  }

  const stay = now.getTime() - new Date(att.checkInAt).getTime();
  if (stay < MIN_STAY_MS) return { code: 400, att, reason: "too_soon", message: "You only just checked in. Wait a minute before checking out." };

  let minutes = Math.floor(stay / 60000);
  const flags: string[] = [];
  if (minutes > MAX_MINUTES) {
    minutes = MAX_MINUTES;
    flags.push("exceeds_max");
  }
  if (minutes < MIN_MINUTES) flags.push("short_stay");
  if (await overlapsOther(att.volunteer, att._id, new Date(att.checkInAt), now)) flags.push("overlap");
  if (via === "manual") flags.push("manual_entry");

  const updated: any = await Attendance.findOneAndUpdate(
    { _id: att._id, checkOutAt: null },
    {
      $set: {
        checkOutAt: now,
        status: "checked_out",
        verification: "pending",
        provisionalMinutes: minutes,
        flags: Array.from(new Set([...(att.flags || []), ...flags])),
      },
      $push: { history: hist(by, "checked_out", { via, minutes, note: note || undefined }) },
    },
    { new: true }
  ).lean();

  if (!updated) {
    const cur: any = await Attendance.findById(att._id).lean();
    return { code: 200, att: cur, duplicate: true };
  }

  await notify(att.volunteer, "attendance_recorded", "Checked Out", `Your check-out for "${opp.title}" was recorded. Hours are pending approval.`, att.application, opp._id);
  await notify(opp.organizer, "hours_review_needed", "Service Hours To Approve", `${att.volunteerName || "A volunteer"} checked out of "${opp.title}". Review their hours.`, att.application, opp._id);
  return { code: 200, att: updated };
}

// ---------- volunteer endpoints ----------
export const checkinInfo = async (req: Request, res: Response) => {
  try {
    const c = await evaluate(req);
    if (!c.ok) return fail(res, c.code, c.message, { reason: c.reason });
    const [att, ngo]: any[] = await Promise.all([
      Attendance.findOne({ application: c.app._id }).lean(),
      User.findById(c.opp.organizer).select("name").lean(),
    ]);
    const d = c.opp.date ? new Date(c.opp.date).getTime() : null;
    const opensAt = d ? new Date(d - BEFORE_H * 3600 * 1000) : null;
    const closesAt = d ? new Date(d + AFTER_H * 3600 * 1000) : null;
    const now = Date.now();
    res.json({
      event: { title: c.opp.title, date: c.opp.date || null, venue: venueOf(c.opp), ngoName: ngo?.name || "" },
      attendance: att ? attDto(att) : null,
      windowOpen: !d || (now >= d - BEFORE_H * 3600 * 1000 && now <= d + AFTER_H * 3600 * 1000),
      window: { opensAt, closesAt },
    });
  } catch (error) {
    console.error(error);
    fail(res, 500, "Could not load this check-in");
  }
};

export const checkInHandler = async (req: Request, res: Response) => {
  try {
    const c = await evaluate(req);
    if (!c.ok) return fail(res, c.code, c.message, { reason: c.reason });
    const r = await performCheckIn(c.app, c.opp, c.user.id, "qr", {});
    if (r.att && (r.code === 200 || r.code === 201)) {
      return res.status(r.code).json({ message: r.duplicate ? "You're already checked in." : "Checked in. Enjoy the event!", attendance: attDto(r.att), duplicate: Boolean(r.duplicate) });
    }
    fail(res, r.code, r.message || "Could not check in", { reason: r.reason });
  } catch (error) {
    console.error(error);
    fail(res, 500, "Could not check in");
  }
};

export const checkOutHandler = async (req: Request, res: Response) => {
  try {
    const c = await evaluate(req);
    if (!c.ok) return fail(res, c.code, c.message, { reason: c.reason });
    const att: any = await Attendance.findOne({ application: c.app._id }).lean();
    if (!att) {
      await record({ type: "checkout_without_checkin", severity: "info", message: "A check-out was attempted before any check-in.", opportunity: c.opp._id, volunteer: c.user.id, application: c.app._id });
      return fail(res, 409, "You haven't checked in yet. Check in first.", { reason: "not_checked_in" });
    }
    const r = await performCheckOut(att, c.opp, c.user.id, "qr");
    if (r.att && r.code === 200) {
      return res.json({ message: r.duplicate ? "You're already checked out." : "Checked out. Thank you! Your hours now wait for the organiser's approval.", attendance: attDto(r.att), duplicate: Boolean(r.duplicate) });
    }
    fail(res, r.code, r.message || "Could not check out", { reason: r.reason });
  } catch (error) {
    console.error(error);
    fail(res, 500, "Could not check out");
  }
};

export const myAttendance = async (req: Request, res: Response) => {
  try {
    const user = me(req);
    if (user.role !== "volunteer") return fail(res, 403, "Volunteer accounts only");

    const [atts, apps]: any[] = await Promise.all([
      Attendance.find({ volunteer: user.id }).sort({ checkInAt: -1 }).limit(100).lean(),
      Application.find({ volunteer: user.id, status: "accepted" }).populate("opportunity", "title date location status").lean(),
    ]);

    const certs: any[] = await Certificate.find({ application: { $in: atts.map((a: any) => a.application) }, verificationStatus: "valid" })
      .select("application certificateId")
      .lean();
    const cmap = new Map<string, string>(certs.map((c) => [String(c.application), c.certificateId] as [string, string]));
    const done = new Set<string>(atts.map((a: any) => String(a.application)));

    const cutoff = Date.now() - AFTER_H * 3600 * 1000;
    const upcoming = apps
      .filter((a: any) => a.opportunity && a.opportunity.status !== "cancelled" && !done.has(String(a._id)) && (!a.opportunity.date || new Date(a.opportunity.date).getTime() >= cutoff))
      .sort((a: any, b: any) => (new Date(a.opportunity.date || 0).getTime()) - (new Date(b.opportunity.date || 0).getTime()))
      .slice(0, 20)
      .map((a: any) => ({ applicationId: a._id, title: a.opportunity.title, date: a.opportunity.date || null, venue: venueOf(a.opportunity) }));

    let approved = 0;
    let pending = 0;
    for (const a of atts) {
      if (a.verification === "approved") approved += a.approvedMinutes || 0;
      if (a.verification === "pending") pending += a.provisionalMinutes || 0;
    }

    res.json({
      upcoming,
      history: atts.map((a: any) => attDto(a, cmap.get(String(a.application)))),
      totals: { approvedMinutes: approved, pendingMinutes: pending },
    });
  } catch (error) {
    console.error(error);
    fail(res, 500, "Could not load your attendance");
  }
};

// ---------- NGO: ownership ----------
async function ownedOpp(req: Request, res: Response): Promise<any | null> {
  const user = me(req);
  const id = p(req.params.opportunityId);
  if (user.role !== "ngo" || !oid(id)) {
    fail(res, 404, "Event not found");
    return null;
  }
  const opp: any = await Opportunity.findOne({ _id: id, organizer: user.id }).lean();
  if (!opp) {
    fail(res, 404, "Event not found");
    return null;
  }
  return opp;
}

async function ownedAttendance(req: Request, res: Response): Promise<any | null> {
  const user = me(req);
  const id = p(req.params.attendanceId);
  if (user.role !== "ngo" || !oid(id)) {
    fail(res, 404, "Record not found");
    return null;
  }
  const a: any = await Attendance.findById(id).lean();
  if (!a || String(a.ngo) !== user.id) {
    fail(res, 404, "Record not found");
    return null;
  }
  return a;
}

// ---------- NGO: QR ----------
export const qrInfo = async (req: Request, res: Response) => {
  try {
    const opp = await ownedOpp(req, res);
    if (!opp) return;
    const doc = await ensureToken(opp);
    const state = tokenState(doc);
    res.set("Cache-Control", "no-store").json({
      state,
      version: doc.version,
      expiresAt: doc.expiresAt,
      revokedAt: doc.revokedAt || null,
      checkinUrl: state === "active" ? checkinUrl(tokenFor(String(opp._id), doc.version)) : null,
      event: { title: opp.title, date: opp.date || null, venue: venueOf(opp) },
    });
  } catch (error) {
    console.error(error);
    fail(res, 500, "Could not load the QR code");
  }
};

async function liveQr(opp: any, res: Response) {
  const doc = await ensureToken(opp);
  const st = tokenState(doc);
  if (st !== "active") {
    fail(res, 409, st === "revoked" ? "This QR code is revoked. Create a new one first." : "This QR code has expired. Create a new one first.");
    return null;
  }
  const token = tokenFor(String(opp._id), doc.version);
  return { doc, token, url: checkinUrl(token) };
}

export const qrPng = async (req: Request, res: Response) => {
  try {
    const opp = await ownedOpp(req, res);
    if (!opp) return;
    const live = await liveQr(opp, res);
    if (!live) return;
    const png = await QRCode.toBuffer(live.url, { errorCorrectionLevel: "M", margin: 2, width: 640 });
    res.status(200).set({
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="Voluntess-CheckIn-${String(opp._id)}.png"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    }).send(png);
  } catch (error) {
    console.error(error);
    fail(res, 500, "Could not create the QR image");
  }
};

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const TAMIL_R = path.join(FONT_DIR, "NotoSansTamil-Regular.ttf");
const TAMIL_B = path.join(FONT_DIR, "NotoSansTamil-Bold.ttf");

export const qrPdf = async (req: Request, res: Response) => {
  try {
    const opp = await ownedOpp(req, res);
    if (!opp) return;
    const live = await liveQr(opp, res);
    if (!live) return;

    const png = await QRCode.toBuffer(live.url, { errorCorrectionLevel: "M", margin: 2, width: 640 });
    const tamilReady = fs.existsSync(TAMIL_R) && fs.existsSync(TAMIL_B);
    const day = (v: any) => (v ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(v)) : "");

    const pdf = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: "Voluntess event check-in", Author: "Voluntess" } });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      try {
        if (tamilReady) {
          doc.registerFont("TamilR", TAMIL_R);
          doc.registerFont("TamilB", TAMIL_B);
        }
        const W = doc.page.width;
        const text = (raw: string, size: number, bold: boolean, color: string, y: number) => {
          const t = String(raw || "").replace(/[\u0000-\u001F\u007F]/g, " ").trim();
          if (!t) return;
          if (/[\u0B80-\u0BFF]/.test(t) && tamilReady) doc.font(bold ? "TamilB" : "TamilR");
          else doc.font(bold ? "Helvetica-Bold" : "Helvetica");
          doc.fontSize(size).fillColor(color).text(t, 48, y, { width: W - 96, align: "center", height: size * 3.2, ellipsis: true });
        };
        doc.rect(24, 24, W - 48, doc.page.height - 48).lineWidth(3).strokeColor("#2563EB").stroke();
        text("Voluntess", 30, true, "#111827", 70);
        text("EVENT CHECK-IN", 14, true, "#2563EB", 112);
        text(opp.title, 26, true, "#111827", 150);
        text(day(opp.date), 15, false, "#4B5563", 235);
        text(venueOf(opp), 13, false, "#4B5563", 262);
        doc.image(png, (W - 320) / 2, 310, { width: 320 });
        text("Scan with your phone camera, then tap Check in.", 14, true, "#111827", 650);
        text("Tap Check out when you leave. Only approved volunteers can check in.", 11, false, "#4B5563", 675);
        text(`This code is valid until ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: process.env.CERT_TIMEZONE || "Asia/Kolkata" }).format(new Date(live.doc.expiresAt))}`, 10, false, "#6B7280", 710);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });

    res.status(200).set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Voluntess-CheckIn-${String(opp._id)}.pdf"`,
      "Content-Length": String(pdf.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    }).send(pdf);
  } catch (error) {
    console.error(error);
    fail(res, 500, "Could not create the QR poster");
  }
};

export const qrRotate = async (req: Request, res: Response) => {
  try {
    const opp = await ownedOpp(req, res);
    if (!opp) return;
    if (opp.status === "cancelled") return fail(res, 409, "This event is cancelled, so a new QR code can't be created.");
    const user = me(req);
    const doc = await ensureToken(opp);
    const version = doc.version + 1;
    const token = tokenFor(String(opp._id), version);
    await CheckinToken.updateOne(
      { _id: doc._id },
      {
        $set: { version, tokenHash: hashToken(token), expiresAt: expiryFor(opp), revokedAt: null, revokedBy: null },
        $push: { history: hist(user.id, "rotated", { version }) },
      }
    );
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    fail(res, 500, "Could not create a new QR code");
  }
};

export const qrRevoke = async (req: Request, res: Response) => {
  try {
    const opp = await ownedOpp(req, res);
    if (!opp) return;
    const user = me(req);
    const doc = await ensureToken(opp);
    await CheckinToken.updateOne(
      { _id: doc._id },
      { $set: { revokedAt: new Date(), revokedBy: user.id }, $push: { history: hist(user.id, "revoked") } }
    );
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    fail(res, 500, "Could not revoke the QR code");
  }
};

// ---------- NGO: overview, rows, export ----------
async function buildRows(oppId: any) {
  const apps: any[] = await Application.find({ opportunity: oppId, status: "accepted" }).populate("volunteer", "name").sort({ createdAt: 1 }).limit(1000).lean();
  const atts: any[] = await Attendance.find({ opportunity: oppId }).lean();
  const certs: any[] = await Certificate.find({ opportunity: oppId, verificationStatus: "valid" }).select("application certificateId").lean();
  const amap = new Map<string, any>(atts.map((a) => [String(a.application), a] as [string, any]));
  const cmap = new Map<string, string>(certs.map((c) => [String(c.application), c.certificateId] as [string, string]));

  return apps.map((a) => {
    const att = amap.get(String(a._id));
    const state = !att ? "not_attended" : att.status === "checked_in" ? "checked_in" : att.verification;
    return {
      applicationId: a._id,
      attendanceId: att ? att._id : null,
      volunteerName: a.volunteer?.name || "Volunteer",
      state,
      checkInAt: att?.checkInAt || null,
      checkOutAt: att?.checkOutAt || null,
      provisionalMinutes: att?.provisionalMinutes || 0,
      approvedMinutes: att?.approvedMinutes || 0,
      flags: att?.flags || [],
      reviewReason: att?.reviewReason || "",
      certificateId: cmap.get(String(a._id)) || null,
    };
  });
}

export const eventOverview = async (req: Request, res: Response) => {
  try {
    const opp = await ownedOpp(req, res);
    if (!opp) return;

    const q = String(req.query.q || "").trim().toLowerCase().slice(0, 80);
    const status = String(req.query.status || "all");
    const date = String(req.query.date || "");
    const all = await buildRows(opp._id);

    const count = (...s: string[]) => all.filter((r) => s.includes(r.state)).length;
    const checkedOut = count("pending", "approved", "rejected");
    const suspiciousCount = await CheckinAttempt.countDocuments({ opportunity: opp._id, severity: "review", reviewed: false });

    let rows = all;
    if (q) rows = rows.filter((r) => r.volunteerName.toLowerCase().includes(q));
    if (status !== "all") rows = rows.filter((r) => r.state === status);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) rows = rows.filter((r) => r.checkInAt && new Date(r.checkInAt).toISOString().slice(0, 10) === date);

    const attempts: any[] = await CheckinAttempt.find({ opportunity: opp._id, severity: "review", reviewed: false })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("volunteer", "name")
      .lean();

    res.json({
      event: { _id: opp._id, title: opp.title, date: opp.date || null, venue: venueOf(opp) },
      limits: { minMinutes: MIN_MINUTES, maxMinutes: MAX_MINUTES },
      stats: {
        registered: all.length,
        checkedIn: count("checked_in"),
        checkedOut,
        notAttended: count("not_attended"),
        completionPercent: all.length ? Math.round((checkedOut / all.length) * 100) : 0,
        pendingApprovals: count("pending"),
        suspicious: suspiciousCount,
      },
      rows,
      attempts: attempts.map((a) => ({ _id: a._id, type: a.type, message: a.message, createdAt: a.createdAt, volunteerName: a.volunteer?.name || "Unknown user" })),
    });
  } catch (error) {
    console.error(error);
    fail(res, 500, "Could not load attendance");
  }
};

const csv = (v: any) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // block spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

export const exportCsv = async (req: Request, res: Response) => {
  try {
    const opp = await ownedOpp(req, res);
    if (!opp) return;
    const rows = await buildRows(opp._id);
    const head = ["Volunteer", "Event", "Event date", "Check-in (UTC)", "Check-out (UTC)", "Provisional minutes", "Approved minutes", "Status", "Flags"];
    const lines = [head.map(csv).join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.volunteerName,
          opp.title,
          opp.date ? new Date(opp.date).toISOString().slice(0, 10) : "",
          r.checkInAt ? new Date(r.checkInAt).toISOString() : "",
          r.checkOutAt ? new Date(r.checkOutAt).toISOString() : "",
          r.provisionalMinutes,
          r.approvedMinutes,
          r.state,
          (r.flags || []).join("; "),
        ].map(csv).join(",")
      );
    }
    res.status(200).set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-${String(opp._id)}.csv"`,
      "Cache-Control": "private, no-store",
    }).send("\uFEFF" + lines.join("\r\n"));
  } catch (error) {
    console.error(error);
    fail(res, 500, "Could not export attendance");
  }
};

// ---------- NGO: manual fallback ----------
export const manualAttendance = async (req: Request, res: Response) => {
  try {
    const user = me(req);
    if (user.role !== "ngo") return fail(res, 403, "NGO accounts only");
    const parsed = z
      .object({ applicationId: z.string(), action: z.enum(["check_in", "check_out"]), reason: z.string().trim().min(3, "Give a short reason").max(300) })
      .safeParse(req.body);
    if (!parsed.success) return fail(res, 400, parsed.error.issues[0]?.message || "Invalid input");
    if (!oid(parsed.data.applicationId)) return fail(res, 404, "Application not found");

    const app: any = await Application.findById(parsed.data.applicationId).lean();
    const opp: any = app ? await Opportunity.findOne({ _id: app.opportunity, organizer: user.id }).lean() : null;
    if (!app || !opp) return fail(res, 404, "Application not found");
    if (app.status !== "accepted") return fail(res, 400, "Only approved volunteers can be recorded");
    if (opp.status === "cancelled") return fail(res, 409, "This event is cancelled");

    let r: Result;
    if (parsed.data.action === "check_in") {
      r = await performCheckIn(app, opp, user.id, "manual", { skipWindow: true, note: parsed.data.reason });
    } else {
      const att: any = await Attendance.findOne({ application: app._id }).lean();
      if (!att) return fail(res, 409, "This volunteer hasn't been checked in yet");
      r = await performCheckOut(att, opp, user.id, "manual", parsed.data.reason);
    }
    if (r.att && (r.code === 200 || r.code === 201)) return res.status(r.code).json(attDto(r.att));
    fail(res, r.code, r.message || "Could not record attendance");
  } catch (error) {
    console.error(error);
    fail(res, 500, "Could not record attendance");
  }
};

// ---------- NGO: audited time correction ----------
export const correctTimes = async (req: Request, res: Response) => {
  try {
    const a = await ownedAttendance(req, res);
    if (!a) return;
    const user = me(req);
    if (await hasValidCert(a.application)) return fail(res, 409, "A certificate is already issued. Revoke it before changing times.");

    const parsed = z
      .object({ checkInAt: z.string().datetime(), checkOutAt: z.string().datetime().nullable().optional(), reason: z.string().trim().min(3, "Give a short reason").max(300) })
      .safeParse(req.body);
    if (!parsed.success) return fail(res, 400, parsed.error.issues[0]?.message || "Invalid times");

    const inAt = new Date(parsed.data.checkInAt);
    const outAt = parsed.data.checkOutAt ? new Date(parsed.data.checkOutAt) : null;
    const now = Date.now();
    if (inAt.getTime() > now + 60000 || (outAt && outAt.getTime() > now + 60000)) return fail(res, 400, "Times can't be in the future");
    if (outAt && outAt <= inAt) return fail(res, 400, "Check-out must be after check-in");

    const set: any = { checkInAt: inAt };
    let minutes = 0;
    if (outAt) {
      minutes = Math.round((outAt.getTime() - inAt.getTime()) / 60000);
      if (minutes > MAX_MINUTES) return fail(res, 400, `A single record can't be longer than ${Math.floor(MAX_MINUTES / 60)} hours`);
      const flags: string[] = (a.flags || []).filter((f: string) => f !== "short_stay" && f !== "overlap");
      if (minutes < MIN_MINUTES) flags.push("short_stay");
      if (await overlapsOther(a.volunteer, a._id, inAt, outAt)) flags.push("overlap");
      flags.push("times_corrected");
      Object.assign(set, { checkOutAt: outAt, status: "checked_out", verification: "pending", provisionalMinutes: minutes, approvedMinutes: 0, reviewReason: "", reviewedBy: null, reviewedAt: null, flags: Array.from(new Set(flags)) });
    } else {
      Object.assign(set, { checkOutAt: null, status: "checked_in", verification: "none", provisionalMinutes: 0, approvedMinutes: 0, reviewReason: "", flags: Array.from(new Set([...(a.flags || []), "times_corrected"])) });
    }

    let updated: any;
    try {
      updated = await Attendance.findOneAndUpdate(
        { _id: a._id, updatedAt: a.updatedAt },
        { $set: set, $push: { history: hist(user.id, "times_corrected", { previous: { checkInAt: a.checkInAt, checkOutAt: a.checkOutAt, provisionalMinutes: a.provisionalMinutes, approvedMinutes: a.approvedMinutes }, reason: parsed.data.reason }) } },
        { new: true }
      ).lean();
    } catch (error: any) {
      if (error?.code === 11000) return fail(res, 409, "This volunteer already has another active check-in");
      throw error;
    }
    if (!updated) return fail(res, 409, "This record just changed. Reload and try again.");

    // Previously approved hours are no longer valid: send the completion record back for review
    await Completion.updateOne(
      { application: a.application, status: "verified" },
      {
        $set: { status: "completion_pending", submittedMinutes: minutes, verifiedMinutes: 0, verifiedBy: null, verifiedAt: null },
        $push: { history: histC(user.id, "attendance_times_corrected", "verified", "completion_pending", { reason: parsed.data.reason }) },
      }
    );

    if (outAt) {
      const opp: any = await Opportunity.findById(a.opportunity).select("title organizer").lean();
      await notify(opp?.organizer || user.id, "hours_review_needed", "Service Hours To Approve", `Times for ${a.volunteerName || "a volunteer"} were corrected. Review the hours.`, a.application, a.opportunity);
    }
    res.json(attDto(updated));
  } catch (error) {
    console.error(error);
    fail(res, 500, "Could not correct the times");
  }
};

// ---------- NGO: approve, reject, correct hours ----------
async function syncCompletion(a: any, by: string, minutes: number) {
  const [opp, ngo]: any[] = await Promise.all([
    Opportunity.findById(a.opportunity).select("title date category").lean(),
    User.findById(a.ngo).select("name").lean(),
  ]);
  await Completion.findOneAndUpdate(
    { application: a.application },
    {
      $set: {
        status: "verified",
        submittedMinutes: minutes,
        verifiedMinutes: minutes,
        verifiedBy: by,
        verifiedAt: new Date(),
        actualStart: a.checkInAt,
        actualEnd: a.checkOutAt,
        rejectionReason: "",
      },
      $setOnInsert: {
        volunteer: a.volunteer,
        opportunity: a.opportunity,
        application: a.application,
        ngo: a.ngo,
        eventDate: opp?.date,
        opportunityTitle: opp?.title || a.opportunityTitle || "",
        ngoName: ngo?.name || a.ngoName || "",
        category: opp?.category || "",
      },
      $push: { history: histC(by, "verified_from_attendance", undefined, "verified", { minutes }) },
    },
    { upsert: true, new: true }
  );
}

export const reviewAttendance = async (req: Request, res: Response) => {
  try {
    const a = await ownedAttendance(req, res);
    if (!a) return;
    const user = me(req);

    const parsed = z
      .object({
        action: z.enum(["approve", "reject", "correct"]),
        confirmedMinutes: z.coerce.number().int().optional(),
        minutes: z.coerce.number().int().optional(),
        reason: z.string().trim().max(300).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return fail(res, 400, "Invalid request");
    const d = parsed.data;

    if (a.status !== "checked_out" || !a.checkOutAt) return fail(res, 409, "The volunteer hasn't checked out yet. Record a check-out or correct the times first.");
    if (await hasValidCert(a.application)) return fail(res, 409, "A certificate is already issued. Revoke it before changing hours.");

    let minutes = 0;
    let verification: "approved" | "rejected" = "approved";
    let reason = d.reason || "";

    if (d.action === "approve") {
      if (a.verification !== "pending") return fail(res, 409, "Only hours awaiting approval can be approved");
      if (d.confirmedMinutes !== a.provisionalMinutes) return fail(res, 409, "The hours changed. Reload and review again.");
      minutes = a.provisionalMinutes;
      if (minutes < MIN_MINUTES || minutes > MAX_MINUTES) return fail(res, 400, "These hours are outside the allowed range. Use Correct hours.");
      const clash = await Attendance.exists({
        volunteer: a.volunteer,
        _id: { $ne: a._id },
        verification: "approved",
        checkInAt: { $lt: a.checkOutAt },
        checkOutAt: { $gt: a.checkInAt },
      });
      if (clash) return fail(res, 409, "These times overlap another approved record for this volunteer. Use Correct hours so the overlap isn't counted twice.");
    } else if (d.action === "reject") {
      if (a.verification !== "pending") return fail(res, 409, "Only hours awaiting approval can be rejected");
      if (reason.length < 3) return fail(res, 400, "Give a short reason");
      verification = "rejected";
    } else {
      minutes = Number(d.minutes);
      if (!Number.isInteger(minutes) || minutes < MIN_MINUTES || minutes > MAX_MINUTES) {
        return fail(res, 400, `Hours must be between ${MIN_MINUTES} minutes and ${Math.floor(MAX_MINUTES / 60)} hours`);
      }
      if (reason.length < 3) return fail(res, 400, "Give a reason for the correction");
    }

    const updated: any = await Attendance.findOneAndUpdate(
      { _id: a._id, verification: a.verification, checkOutAt: { $ne: null } },
      {
        $set: { verification, approvedMinutes: verification === "approved" ? minutes : 0, reviewReason: reason, reviewedBy: user.id, reviewedAt: new Date() },
        $push: { history: hist(user.id, d.action === "correct" ? "hours_corrected" : verification === "approved" ? "hours_approved" : "hours_rejected", { minutes, previous: { verification: a.verification, approvedMinutes: a.approvedMinutes }, reason }) },
      },
      { new: true }
    ).lean();
    if (!updated) return fail(res, 409, "This record just changed. Reload and try again.");

    if (verification === "approved") {
      try {
        await syncCompletion(updated, user.id, minutes);
      } catch (error) {
        console.error("Completion sync failed, rolling back:", error);
        await Attendance.updateOne({ _id: a._id }, { $set: { verification: a.verification, approvedMinutes: a.approvedMinutes, reviewReason: a.reviewReason || "" } });
        return fail(res, 500, "Could not save the approved hours. Nothing was changed.");
      }
    }

    const opp: any = await Opportunity.findById(a.opportunity).select("title").lean();
    if (verification === "approved") {
      await notify(a.volunteer, "hours_approved", "Service Hours Approved", `${Math.floor(minutes / 60)} h ${minutes % 60} min for "${opp?.title || "your event"}" were approved.`, a.application, a.opportunity);
    } else {
      await notify(a.volunteer, "hours_rejected", "Service Hours Not Approved", `Your hours for "${opp?.title || "an event"}" weren't approved. Reason: ${reason}`, a.application, a.opportunity);
    }
    res.json(attDto(updated));
  } catch (error) {
    console.error(error);
    fail(res, 500, "Could not save the review");
  }
};

export const reviewAttempt = async (req: Request, res: Response) => {
  try {
    const user = me(req);
    const id = p(req.params.attemptId);
    if (user.role !== "ngo" || !oid(id)) return fail(res, 404, "Not found");
    const at: any = await CheckinAttempt.findById(id).lean();
    const owns = at && at.opportunity && (await Opportunity.exists({ _id: at.opportunity, organizer: user.id }));
    if (!owns) return fail(res, 404, "Not found");
    await CheckinAttempt.updateOne({ _id: id }, { $set: { reviewed: true, reviewedBy: user.id, reviewedAt: new Date() } });
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    fail(res, 500, "Could not update");
  }
};