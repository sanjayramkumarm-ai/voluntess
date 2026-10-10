import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const TAMIL_REGULAR = path.join(FONT_DIR, "NotoSansTamil-Regular.ttf");
const TAMIL_BOLD = path.join(FONT_DIR, "NotoSansTamil-Bold.ttf");
const TAMIL = /[\u0B80-\u0BFF]/;

const NAVY = "#111827";
const BLUE = "#2563EB";
const GRAY = "#4B5563";
const PALE = "#DBEAFE";

export function verifyUrlFor(certificateId: string) {
  const base = (process.env.PUBLIC_APP_URL || process.env.CLIENT_URL || "").replace(/\/+$/, "");
  if (!base) throw new Error("PUBLIC_APP_URL is not set");
  return `${base}/verify-certificate/${certificateId}`;
}

export function formatMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

const clean = (s: any) => String(s ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim();

function longDate(value: any, timeZone: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone }).format(new Date(value));
}

export async function renderCertificate(cert: any): Promise<Buffer> {
  const url = verifyUrlFor(cert.certificateId);
  const qr = await QRCode.toBuffer(url, { errorCorrectionLevel: "M", margin: 1, width: 360 });
  const tamilReady = fs.existsSync(TAMIL_REGULAR) && fs.existsSync(TAMIL_BOLD);

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 0,
      info: { Title: `Voluntess Certificate ${cert.certificateId}`, Author: "Voluntess" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      if (tamilReady) {
        doc.registerFont("TamilRegular", TAMIL_REGULAR);
        doc.registerFont("TamilBold", TAMIL_BOLD);
      }

      const W = doc.page.width;
      const H = doc.page.height;

      const setFont = (text: string, bold: boolean) => {
        if (TAMIL.test(text)) {
          if (tamilReady) {
            doc.font(bold ? "TamilBold" : "TamilRegular");
            return;
          }
          console.warn("Tamil text in certificate but Tamil font files are missing in assets/fonts");
        }
        doc.font(bold ? "Helvetica-Bold" : "Helvetica");
      };

      const put = (
        raw: string,
        x: number,
        y: number,
        o: { size: number; bold?: boolean; color?: string; width: number; align?: "left" | "center" | "right"; height?: number; min?: number; spacing?: number }
      ) => {
        const text = clean(raw);
        if (!text) return;
        setFont(text, Boolean(o.bold));
        let size = o.size;
        const min = o.min ?? o.size;
        doc.fontSize(size);
        if (o.height) {
          while (size > min && doc.heightOfString(text, { width: o.width }) > o.height) {
            size -= 1;
            doc.fontSize(size);
          }
        }
        doc.fillColor(o.color || NAVY).text(text, x, y, {
          width: o.width,
          align: o.align || "center",
          height: o.height,
          ellipsis: Boolean(o.height),
          characterSpacing: o.spacing || 0,
        });
      };

      // Borders
      doc.lineWidth(3).strokeColor(BLUE).rect(24, 24, W - 48, H - 48).stroke();
      doc.lineWidth(1).strokeColor(PALE).rect(34, 34, W - 68, H - 68).stroke();

      // Wordmark
      doc.font("Helvetica-Bold").fontSize(26);
      const w1 = doc.widthOfString("Volun");
      const w2 = doc.widthOfString("tess");
      const x0 = (W - (w1 + w2)) / 2;
      doc.fillColor(NAVY).text("Volun", x0, 56, { lineBreak: false });
      doc.fillColor(BLUE).text("tess", x0 + w1, 56, { lineBreak: false });

      put("CERTIFICATE OF VOLUNTEERING", 60, 96, { size: 22, bold: true, width: W - 120, spacing: 2 });
      doc.lineWidth(1.5).strokeColor(BLUE).moveTo(W / 2 - 60, 128).lineTo(W / 2 + 60, 128).stroke();

      put("This certificate is presented to", 60, 140, { size: 12, color: GRAY, width: W - 120 });
      put(cert.volunteerName, 80, 160, { size: 38, bold: true, color: BLUE, width: W - 160, height: 56, min: 20 });
      put("for volunteering on", 60, 228, { size: 12, color: GRAY, width: W - 120 });
      put(cert.opportunityTitle, 90, 247, { size: 24, bold: true, width: W - 180, height: 56, min: 14 });
      put("organised by", 60, 308, { size: 11, color: GRAY, width: W - 120 });
      put(cert.ngoName, 90, 323, { size: 18, bold: true, color: GRAY, width: W - 180, height: 26, min: 11 });

      put(`Verified service hours: ${formatMinutes(cert.verifiedMinutesAtIssue)}`, 60, 360, { size: 16, bold: true, width: W - 120 });
      if (cert.completionDate) {
        put(`Completed on ${longDate(cert.completionDate, "UTC")}`, 60, 384, { size: 12, color: GRAY, width: W - 120 });
      }
      if (cert.description) {
        put(clean(cert.description).slice(0, 220), 110, 406, { size: 10, color: GRAY, width: W - 220, height: 30, min: 8 });
      }

      // Bottom row: signature area, statement, QR
      doc.lineWidth(1).strokeColor(GRAY).moveTo(80, 505).lineTo(280, 505).stroke();
      put("Authorized representative", 80, 509, { size: 9, color: GRAY, width: 200, align: "left" });
      put(cert.ngoName, 80, 522, { size: 10, bold: true, width: 200, align: "left", height: 14, min: 7 });

      put(
        "This certificate records participation verified by the issuing organisation through the Voluntess platform. It is not a government-issued or accredited qualification.",
        310, 470, { size: 8, color: GRAY, width: 230, height: 46, min: 6 }
      );
      put(`Issued on ${longDate(cert.issuedAt, process.env.CERT_TIMEZONE || "Asia/Kolkata")}`, 310, 520, { size: 9, bold: true, width: 230 });

      doc.image(qr, W - 80 - 150 / 2 - 43, 440, { width: 86 });
      put("Scan to verify", W - 230, 530, { size: 8, color: GRAY, width: 150 });
      put(cert.certificateId, W - 230, 542, { size: 9, bold: true, width: 150 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}