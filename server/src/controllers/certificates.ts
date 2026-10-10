import { Request, Response } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import Application from "../models/Application";
import Opportunity from "../models/Opportunity";
import Completion from "../models/Completion";
import Certificate from "../models/Certificate";
import User from "../models/User";
import Notification from "../models/Notification";
import { renderCertificate } from "../services/certificatePdf";

const MIN_MINUTES = Math.max(1, Number(process.env.CERT_MIN_MINUTES) || 15);
const MAX_MINUTES = Math.max(MIN_MINUTES, Number(process.env.CERT_MAX_MINUTES) || 960);
const REQUIRE_VERIFIED_NGO = process.env.CERT_REQUIRE_VERIFIED_NGO === "true";
const CERT_ID_RE = /^VOL-\d{4}-[A-Z0-9]{8}$/;
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const publicVerifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "unavailable", message: "Too many requests. Please try again shortly." },
});

function me(req: Request) {
  const u = (req as any).user;
  return { id: String(u?.id || u?._id || ""), role: String(u?.role || "") };
}

const fail = (res: Response, code: number, message: string) => res.status(code).json({ message });
const oid = (v: any) => mongoose.isValidObjectId(v);
const histEntry = (by: string, action: string, fromStatus?: string, toStatus?: string, details?: any) => ({
  at: new Date(), by, action, fromStatus, toStatus, details,
});

function randomSuffix(len = 8) {
  let out = "";
  while (out.length < len) {
    for (const byte of crypto.randomBytes(len)) {
      if (byte < 248 && out.length < len) out += ALPHABET[byte % ALPHABET.length];
    }
  }
  return out;
}

function maskName(name: string) {
  const masked = String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => Array.from(w)[0] + "***")
    .join(" ");
  return masked || "Volunteer";
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------- Hours validation ----------
const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
const durationSchema = z.object({
  hours: z.coerce.number().int().min(0).max(24).optional(),
  minutes: z.coerce.number().int().min(0).max(59).optional(),
  startTime: z.string().regex(timeRe, "Use HH:MM for start time").optional(),
  endTime: z.string().regex(timeRe, "Use HH:MM for end time").optional(),
  note: z.string().trim().max(500, "Note must be 500 characters or less").optional(),
});

function atEventTime(eventDate: Date, t: string) {
  const [h, m] = t.split(":").map(Number);
  return new Date(Date.UTC(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate(), h, m));
}

type Duration = { minutes?: number; start?: Date; end?: Date; note?: string };

function resolveDuration(
  eventDate: Date | undefined,
  d: z.infer<typeof durationSchema>,
  required: boolean
): { error: string } | Duration {
  const hasStart = Boolean(d.startTime);
  const hasEnd = Boolean(d.endTime);
  const entered =
    d.hours !== undefined || d.minutes !== undefined ? (d.hours || 0) * 60 + (d.minutes || 0) : undefined;

  let minutes: number | undefined;
  let start: Date | undefined;
  let end: Date | undefined;

  if (hasStart !== hasEnd) return { error: "Enter both start and end time, or neither" };

  if (hasStart && hasEnd) {
    if (!eventDate) return { error: "This opportunity has no date, so times can't be recorded" };
    start = atEventTime(eventDate, d.startTime as string);
    end = atEventTime(eventDate, d.endTime as string);
    if (end <= start) return { error: "End time must be after start time" };
    minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    if (entered !== undefined && entered !== minutes) {
      return { error: "Hours don't match the start and end time" };
    }
  } else if (entered !== undefined) {
    minutes = entered;
  }

  if (minutes === undefined) {
    return required ? { error: "Enter the service hours" } : { note: d.note };
  }
  if (minutes < MIN_MINUTES) return { error: `Service time must be at least ${MIN_MINUTES} minutes` };
  if (minutes > MAX_MINUTES) return { error: `Service time can't be more than ${Math.floor(MAX_MINUTES / 60)} hours` };

  return { minutes, start, end, note: d.note };
}

async function overlaps(volunteer: any, exceptId: any, start?: Date, end?: Date) {
  if (!start || !end) return false;
  const q: any = {
    volunteer,
    status: { $in: ["completion_pending", "verified"] },
    actualStart: { $lt: end },
    actualEnd: { $gt: start },
  };
  if (exceptId) q._id = { $ne: exceptId };
  return Boolean(await Completion.exists(q));
}

const hasValidCert = async (application: any) =>
  Boolean(await Certificate.exists({ application, verificationStatus: "valid" }));

async function loadOwned(req: Request, res: Response): Promise<any | null> {
  const user = me(req);
  if (user.role !== "ngo" || !oid(req.params.completionId)) {
    fail(res, 404, "Record not found");
    return null;
  }
  const c: any = await Completion.findById(req.params.completionId);
  if (!c || String(c.ngo) !== user.id) {
    fail(res, 404, "Record not found");
    return null;
  }
  return c;
}

const timeOf = (d?: Date | null) => (d ? new Date(d).toISOString().slice(11, 16) : "");

// ---------- DTOs (explicit, never raw documents) ----------
const certDto = (c: any) => ({
  certificateId: c.certificateId,
  title: "Certificate of Volunteering",
  volunteerName: c.volunteerName,
  opportunityTitle: c.opportunityTitle,
  ngoName: c.ngoName,
  category: c.category || "",
  verifiedMinutes: c.verifiedMinutesAtIssue,
  completionDate: c.completionDate || null,
  issuedAt: c.issuedAt,
  status: c.verificationStatus,
  showNamePublicly: Boolean(c.showNamePublicly),
});

const completionDto = (c: any) => ({
  _id: c._id,
  status: c.status,
  submittedMinutes: c.submittedMinutes || 0,
  verifiedMinutes: c.verifiedMinutes || 0,
  startTime: timeOf(c.actualStart),
  endTime: timeOf(c.actualEnd),
  note: c.completionNotes || "",
  rejectionReason: c.rejectionReason || "",
  updatedAt: c.updatedAt,
});

// ================= NGO: completions =================
export const ngoOpportunities = async (req: Request, res: Response) => {
  try {
    const user = me(req);
    if (user.role !== "ngo") return fail(res, 403, "NGO accounts only");

    const opps: any[] = await Opportunity.find({ organizer: user.id }).select("title date status").sort({ date: -1 }).lean();
    const counts = await Application.aggregate([
      { $match: { status: "accepted", opportunity: { $in: opps.map((o) => o._id) } } },
      { $group: { _id: "$opportunity", total: { $sum: 1 } } },
    ]);
    const map = new Map<string, number>(counts.map((c: any) => [String(c._id), c.total] as [string, number]));

    res.json(opps.map((o) => ({ _id: o._id, title: o.title, date: o.date, accepted: map.get(String(o._id)) || 0 })));
  } catch (error) {
    fail(res, 500, "Could not load opportunities");
  }
};

export const ngoCompletionRows = async (req: Request, res: Response) => {
  try {
    const user = me(req);
    if (user.role !== "ngo") return fail(res, 403, "NGO accounts only");
    const oppId = String(req.query.opportunityId || "");
    if (!oid(oppId)) return fail(res, 404, "Opportunity not found");

    const opp: any = await Opportunity.findOne({ _id: oppId, organizer: user.id }).select("title date").lean();
    if (!opp) return fail(res, 404, "Opportunity not found");

    const apps: any[] = await Application.find({ opportunity: oppId, status: "accepted" })
      .populate("volunteer", "name")
      .sort({ createdAt: 1 })
      .lean();
    const comps: any[] = await Completion.find({ opportunity: oppId }).lean();
    const certs: any[] = await Certificate.find({ opportunity: oppId, verificationStatus: "valid" })
      .select("certificateId application")
      .lean();

    const compMap = new Map<string, any>(comps.map((c) => [String(c.application), c] as [string, any]));
    const certMap = new Map<string, any>(certs.map((c) => [String(c.application), c] as [string, any]));

    res.json({
      opportunity: { _id: opp._id, title: opp.title, date: opp.date },
      limits: { minMinutes: MIN_MINUTES, maxMinutes: MAX_MINUTES },
      rows: apps.map((a) => {
        const comp = compMap.get(String(a._id));
        const cert = certMap.get(String(a._id));
        return {
          applicationId: a._id,
          volunteerName: a.volunteer?.name || "Volunteer",
          state: comp ? comp.status : "accepted",
          completion: comp ? completionDto(comp) : null,
          certificateId: cert ? cert.certificateId : null,
        };
      }),
    });
  } catch (error) {
    fail(res, 500, "Could not load completion records");
  }
};

export const createCompletion = async (req: Request, res: Response) => {
  try {
    const user = me(req);
    if (user.role !== "ngo") return fail(res, 403, "NGO accounts only");

    const parsed = z.object({ applicationId: z.string() }).merge(durationSchema).safeParse(req.body);
    if (!parsed.success) return fail(res, 400, parsed.error.issues[0]?.message || "Invalid input");
    if (!oid(parsed.data.applicationId)) return fail(res, 404, "Application not found");

    const app: any = await Application.findById(parsed.data.applicationId).populate("opportunity");
    const opp: any = app?.opportunity;
    if (!app || !opp || String(opp.organizer) !== user.id) return fail(res, 404, "Application not found");
    if (app.status !== "accepted") return fail(res, 400, "Only accepted volunteers can be recorded");

    if (opp.date && new Date(opp.date).getTime() > Date.now() + 24 * 3600 * 1000) {
      return fail(res, 400, "This opportunity hasn't happened yet");
    }

    const dur = resolveDuration(opp.date ? new Date(opp.date) : undefined, parsed.data, false);
    if ("error" in dur) return fail(res, 400, dur.error);
    if (await overlaps(app.volunteer, null, dur.start, dur.end)) {
      return fail(res, 409, "This volunteer already has an overlapping verified or pending record");
    }

    const ngoUser: any = await User.findById(user.id).select("name");
    const status = dur.minutes !== undefined ? "completion_pending" : "attendance_recorded";

    const created: any = await Completion.create({
      volunteer: app.volunteer,
      opportunity: opp._id,
      application: app._id,
      ngo: user.id,
      eventDate: opp.date,
      actualStart: dur.start || null,
      actualEnd: dur.end || null,
      submittedMinutes: dur.minutes || 0,
      status,
      completionNotes: dur.note || "",
      opportunityTitle: opp.title || "",
      ngoName: ngoUser?.name || "",
      category: opp.category || "",
      history: [histEntry(user.id, "attendance_recorded", undefined, status, { minutes: dur.minutes || 0 })],
    });

    res.status(201).json(completionDto(created));
  } catch (error: any) {
    if (error?.code === 11000) return fail(res, 409, "A record already exists for this volunteer");
    fail(res, 500, "Could not record attendance");
  }
};

export const updateCompletion = async (req: Request, res: Response) => {
  try {
    const c = await loadOwned(req, res);
    if (!c) return;
    const user = me(req);

    if (await hasValidCert(c.application)) {
      return fail(res, 409, "A certificate is already issued. Revoke it before correcting the hours.");
    }

    const parsed = durationSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, parsed.error.issues[0]?.message || "Invalid input");

    const dur = resolveDuration(c.eventDate, parsed.data, true);
    if ("error" in dur) return fail(res, 400, dur.error);
    if (await overlaps(c.volunteer, c._id, dur.start, dur.end)) {
      return fail(res, 409, "This volunteer already has an overlapping verified or pending record");
    }

    const previous = {
      submittedMinutes: c.submittedMinutes,
      verifiedMinutes: c.verifiedMinutes,
      start: c.actualStart,
      end: c.actualEnd,
      note: c.completionNotes,
    };

    const updated: any = await Completion.findOneAndUpdate(
      { _id: c._id, status: c.status },
      {
        $set: {
          status: "completion_pending",
          submittedMinutes: dur.minutes,
          verifiedMinutes: 0,
          actualStart: dur.start || null,
          actualEnd: dur.end || null,
          completionNotes: dur.note ?? c.completionNotes,
          verifiedBy: null,
          verifiedAt: null,
          rejectionReason: "",
        },
        $push: { history: histEntry(user.id, "hours_updated", c.status, "completion_pending", { previous, minutes: dur.minutes }) },
      },
      { new: true }
    );
    if (!updated) return fail(res, 409, "This record just changed. Reload and try again.");
    res.json(completionDto(updated));
  } catch (error) {
    fail(res, 500, "Could not update the record");
  }
};

export const verifyCompletion = async (req: Request, res: Response) => {
  try {
    const c = await loadOwned(req, res);
    if (!c) return;
    const user = me(req);

    const parsed = z.object({ confirmedMinutes: z.coerce.number().int() }).safeParse(req.body);
    if (!parsed.success) return fail(res, 400, "Confirm the exact hours you reviewed");

    if (c.status !== "completion_pending") return fail(res, 409, "Only records awaiting confirmation can be verified");
    if (parsed.data.confirmedMinutes !== c.submittedMinutes) {
      return fail(res, 409, "The hours changed. Review the record again before confirming.");
    }
    if (c.submittedMinutes < MIN_MINUTES || c.submittedMinutes > MAX_MINUTES) {
      return fail(res, 400, "Service time is outside the allowed range");
    }

    const app: any = await Application.findById(c.application).select("status");
    if (!app || app.status !== "accepted") return fail(res, 400, "This application is no longer accepted");

    const updated: any = await Completion.findOneAndUpdate(
      { _id: c._id, status: "completion_pending", submittedMinutes: parsed.data.confirmedMinutes },
      {
        $set: { status: "verified", verifiedMinutes: parsed.data.confirmedMinutes, verifiedBy: user.id, verifiedAt: new Date(), rejectionReason: "" },
        $push: { history: histEntry(user.id, "verified", "completion_pending", "verified", { minutes: parsed.data.confirmedMinutes }) },
      },
      { new: true }
    );
    if (!updated) return fail(res, 409, "This record just changed. Reload and try again.");
    res.json(completionDto(updated));
  } catch (error) {
    fail(res, 500, "Could not verify the record");
  }
};

export const rejectCompletion = async (req: Request, res: Response) => {
  try {
    const c = await loadOwned(req, res);
    if (!c) return;
    const user = me(req);

    const parsed = z.object({ reason: z.string().trim().min(3, "Give a short reason").max(300) }).safeParse(req.body);
    if (!parsed.success) return fail(res, 400, parsed.error.issues[0]?.message || "Give a reason");

    if (c.status === "rejected") return fail(res, 409, "Already rejected");
    if (await hasValidCert(c.application)) {
      return fail(res, 409, "A certificate is already issued. Revoke it first.");
    }

    const updated: any = await Completion.findOneAndUpdate(
      { _id: c._id, status: c.status },
      {
        $set: { status: "rejected", verifiedMinutes: 0, verifiedBy: null, verifiedAt: null, rejectionReason: parsed.data.reason },
        $push: { history: histEntry(user.id, "rejected", c.status, "rejected", { reason: parsed.data.reason }) },
      },
      { new: true }
    );
    if (!updated) return fail(res, 409, "This record just changed. Reload and try again.");
    res.json(completionDto(updated));
  } catch (error) {
    fail(res, 500, "Could not reject the record");
  }
};

// ================= NGO: certificates =================
export const issueCertificate = async (req: Request, res: Response) => {
  try {
    const c = await loadOwned(req, res);
    if (!c) return;
    const user = me(req);

    if (c.status !== "verified") return fail(res, 409, "Confirm the completion before issuing a certificate");
    if (c.verifiedMinutes < MIN_MINUTES || c.verifiedMinutes > MAX_MINUTES) {
      return fail(res, 400, "Verified hours are outside the allowed range");
    }

    const app: any = await Application.findById(c.application).select("status");
    if (!app || app.status !== "accepted") return fail(res, 400, "This application is no longer accepted");

    const [volunteer, ngoUser, opp]: any[] = await Promise.all([
      User.findById(c.volunteer).select("name"),
      User.findById(user.id).select("name verified"),
      Opportunity.findById(c.opportunity).select("title description category"),
    ]);
    if (!volunteer || !ngoUser || !opp) return fail(res, 404, "Record not found");
    if (REQUIRE_VERIFIED_NGO && !ngoUser.verified) {
      return fail(res, 403, "Only verified NGOs can issue certificates");
    }

    const year = new Date().getUTCFullYear();
    let created: any = null;

    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      try {
        created = await Certificate.create({
          certificateId: `VOL-${year}-${randomSuffix(8)}`,
          volunteer: c.volunteer,
          opportunity: c.opportunity,
          application: c.application,
          completion: c._id,
          ngo: user.id,
          volunteerName: volunteer.name,
          ngoName: ngoUser.name,
          opportunityTitle: opp.title,
          category: opp.category || "",
          description: String(opp.description || "").slice(0, 300),
          verifiedMinutesAtIssue: c.verifiedMinutes,
          completionDate: c.eventDate,
          issuedBy: user.id,
          history: [{ at: new Date(), by: user.id, action: "issued", details: { minutes: c.verifiedMinutes } }],
        });
      } catch (error: any) {
        if (error?.code !== 11000) throw error;
        if (error?.keyPattern?.application) {
          return fail(res, 409, "A certificate has already been issued for this volunteer");
        }
        // certificateId collision: try a new suffix
      }
    }
    if (!created) return fail(res, 500, "Could not generate a certificate ID. Try again.");

    await Completion.updateOne(
      { _id: c._id },
      { $push: { history: histEntry(user.id, "certificate_issued", "verified", "verified", { certificateId: created.certificateId }) } }
    );

    try {
      await Notification.create({
        recipient: c.volunteer,
        type: "certificate_issued",
        title: "Certificate Issued",
        message: `You earned a certificate for "${opp.title}".`,
        relatedApplication: c.application,
        relatedOpportunity: c.opportunity,
      });
    } catch (error) {
      console.error("Certificate notification failed:", error);
    }

    res.status(201).json(certDto(created));
  } catch (error) {
    fail(res, 500, "Could not issue the certificate");
  }
};

export const ngoCertificates = async (req: Request, res: Response) => {
  try {
    const user = me(req);
    if (user.role !== "ngo") return fail(res, 403, "NGO accounts only");
    const list: any[] = await Certificate.find({ ngo: user.id }).sort({ issuedAt: -1 }).limit(200).lean();
    res.json(list.map(certDto));
  } catch (error) {
    fail(res, 500, "Could not load certificates");
  }
};

// NGO that issued it, or an admin reviewing a dispute
export const revokeCertificate = async (req: Request, res: Response) => {
  try {
    const user = me(req);
    const id = String(req.params.certificateId || "").toUpperCase();
    if (!CERT_ID_RE.test(id)) return fail(res, 404, "Certificate not found");

    const parsed = z
      .object({
        reasonCode: z.enum(["error_in_hours", "wrong_volunteer", "participation_not_confirmed", "fraud", "other"]),
        note: z.string().trim().max(300).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return fail(res, 400, "Choose a revocation reason");

    const cert: any = await Certificate.findOne({ certificateId: id });
    const allowed = cert && (user.role === "admin" || (user.role === "ngo" && String(cert.ngo) === user.id));
    if (!allowed) return fail(res, 404, "Certificate not found");

    const updated: any = await Certificate.findOneAndUpdate(
      { _id: cert._id, verificationStatus: "valid" },
      {
        $set: {
          verificationStatus: "revoked",
          revokedAt: new Date(),
          revokedBy: user.id,
          revocationReasonCode: parsed.data.reasonCode,
          revocationNote: parsed.data.note || "",
        },
        $push: { history: { at: new Date(), by: user.id, action: "revoked", details: { reasonCode: parsed.data.reasonCode } } },
      },
      { new: true }
    );
    if (!updated) return fail(res, 409, "This certificate is already revoked");

    await Completion.updateOne(
      { _id: cert.completion },
      { $push: { history: histEntry(user.id, "certificate_revoked", undefined, undefined, { certificateId: id, reasonCode: parsed.data.reasonCode }) } }
    );

    res.json(certDto(updated));
  } catch (error) {
    fail(res, 500, "Could not revoke the certificate");
  }
};

// ================= Volunteer =================
export const listMyCertificates = async (req: Request, res: Response) => {
  try {
    const user = me(req);
    if (user.role !== "volunteer") return fail(res, 403, "Volunteer accounts only");

    const parsed = z
      .object({
        q: z.string().trim().max(80).optional(),
        filter: z.enum(["all", "recent", "verified"]).default("all"),
        year: z.coerce.number().int().min(2000).max(2100).optional(),
        ngo: z.string().trim().max(120).optional(),
        sort: z.enum(["newest", "oldest", "hours", "title"]).default("newest"),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(50).default(10),
      })
      .safeParse(req.query);
    if (!parsed.success) return fail(res, 400, "Invalid filters");
    const p = parsed.data;

    const query: any = { volunteer: user.id };
    if (p.filter === "verified") query.verificationStatus = "valid";
    if (p.filter === "recent") query.issuedAt = { $gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) };
    if (p.year) query.completionDate = { $gte: new Date(Date.UTC(p.year, 0, 1)), $lt: new Date(Date.UTC(p.year + 1, 0, 1)) };
    if (p.ngo) query.ngoName = p.ngo;
    if (p.q) {
      const rx = new RegExp(escapeRegex(p.q), "i");
      query.$or = [{ opportunityTitle: rx }, { ngoName: rx }, { certificateId: rx }];
    }

    const sorts: any = {
      newest: { issuedAt: -1 },
      oldest: { issuedAt: 1 },
      hours: { verifiedMinutesAtIssue: -1 },
      title: { opportunityTitle: 1 },
    };

    const [total, items, all] = await Promise.all([
      Certificate.countDocuments(query),
      Certificate.find(query).sort(sorts[p.sort]).skip((p.page - 1) * p.limit).limit(p.limit).lean(),
      Certificate.find({ volunteer: user.id }).select("completionDate ngoName").lean(),
    ]);

    const years = Array.from(
      new Set((all as any[]).filter((c) => c.completionDate).map((c) => new Date(c.completionDate).getUTCFullYear()))
    ).sort((a, b) => b - a);
    const ngos = Array.from(new Set((all as any[]).map((c) => c.ngoName))).sort();

    res.json({
      items: (items as any[]).map(certDto),
      total,
      page: p.page,
      pages: Math.max(1, Math.ceil(total / p.limit)),
      facets: { years, ngos },
    });
  } catch (error) {
    fail(res, 500, "Could not load certificates");
  }
};

// Totals come only from VERIFIED completion records, never from the client.
export const mySummary = async (req: Request, res: Response) => {
  try {
    const user = me(req);
    if (user.role !== "volunteer") return fail(res, 403, "Volunteer accounts only");

    const verified: any[] = await Completion.find({ volunteer: user.id, status: "verified" })
      .select("verifiedMinutes eventDate ngoName category opportunityTitle")
      .limit(5000)
      .lean();

    const now = new Date();
    let total = 0, month = 0, year = 0;
    const byNgo = new Map<string, number>();
    const byCategory = new Map<string, number>();
    const byOpp = new Map<string, number>();

    for (const c of verified) {
      const m = c.verifiedMinutes || 0;
      total += m;
      if (c.eventDate) {
        const d = new Date(c.eventDate);
        if (d.getUTCFullYear() === now.getUTCFullYear()) {
          year += m;
          if (d.getUTCMonth() === now.getUTCMonth()) month += m;
        }
      }
      byNgo.set(c.ngoName || "Unknown", (byNgo.get(c.ngoName || "Unknown") || 0) + m);
      byCategory.set(c.category || "Other", (byCategory.get(c.category || "Other") || 0) + m);
      byOpp.set(c.opportunityTitle || "Opportunity", (byOpp.get(c.opportunityTitle || "Opportunity") || 0) + m);
    }

    const top = (map: Map<string, number>) =>
      Array.from(map.entries()).map(([name, minutes]) => ({ name, minutes })).sort((a, b) => b.minutes - a.minutes).slice(0, 10);

    const [certificates, latest]: any[] = await Promise.all([
      Certificate.countDocuments({ volunteer: user.id, verificationStatus: "valid" }),
      Certificate.findOne({ volunteer: user.id, verificationStatus: "valid" }).sort({ issuedAt: -1 }).lean(),
    ]);

    res.json({
      certificates,
      totalMinutes: total,
      monthMinutes: month,
      yearMinutes: year,
      completedOpportunities: verified.length,
      latest: latest ? certDto(latest) : null,
      byNgo: top(byNgo),
      byCategory: top(byCategory),
      byOpportunity: top(byOpp),
    });
  } catch (error) {
    fail(res, 500, "Could not load your summary");
  }
};

export const setPrivacy = async (req: Request, res: Response) => {
  try {
    const user = me(req);
    const id = String(req.params.certificateId || "").toUpperCase();
    const parsed = z.object({ showName: z.boolean() }).safeParse(req.body);
    if (!CERT_ID_RE.test(id) || !parsed.success) return fail(res, 400, "Invalid request");

    const updated: any = await Certificate.findOneAndUpdate(
      { certificateId: id, volunteer: user.id },
      { $set: { showNamePublicly: parsed.data.showName } },
      { new: true }
    );
    if (!updated) return fail(res, 404, "Certificate not found");
    res.json(certDto(updated));
  } catch (error) {
    fail(res, 500, "Could not save the setting");
  }
};

// ================= Download (private) =================
export const downloadCertificate = async (req: Request, res: Response) => {
  try {
    const user = me(req);
    const id = String(req.params.certificateId || "").toUpperCase();
    if (!CERT_ID_RE.test(id)) return fail(res, 404, "Certificate not found");

    const cert: any = await Certificate.findOne({ certificateId: id }).lean();
    const allowed =
      cert &&
      (String(cert.volunteer) === user.id ||
        (user.role === "ngo" && String(cert.ngo) === user.id) ||
        user.role === "admin");
    if (!allowed) return fail(res, 404, "Certificate not found");
    if (cert.verificationStatus !== "valid") return fail(res, 410, "This certificate has been revoked");

    const pdf = await renderCertificate(cert);
    res
      .status(200)
      .set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Voluntess-Certificate-${id}.pdf"`,
        "Content-Length": String(pdf.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      })
      .send(pdf);
  } catch (error) {
    console.error("Certificate PDF failed:", error);
    fail(res, 500, "Could not generate the PDF");
  }
};

// ================= Public verification =================
export const publicVerify = async (req: Request, res: Response) => {
  try {
    res.set("Cache-Control", "no-store");
    const id = String(req.params.certificateId || "").toUpperCase();
    if (!CERT_ID_RE.test(id)) return res.status(404).json({ status: "not_found" });

    const cert: any = await Certificate.findOne({ certificateId: id }).lean();
    if (!cert) return res.status(404).json({ status: "not_found" });

    if (cert.verificationStatus === "revoked") {
      return res.json({
        status: "revoked",
        certificateId: cert.certificateId,
        message: "This certificate has been revoked and is no longer valid.",
      });
    }

    res.json({
      status: "valid",
      certificate: {
        certificateId: cert.certificateId,
        volunteerName: cert.showNamePublicly ? cert.volunteerName : maskName(cert.volunteerName),
        opportunityTitle: cert.opportunityTitle,
        ngoName: cert.ngoName,
        category: cert.category || "",
        verifiedMinutes: cert.verifiedMinutesAtIssue,
        completionDate: cert.completionDate || null,
        issuedAt: cert.issuedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ status: "unavailable" });
  }
};