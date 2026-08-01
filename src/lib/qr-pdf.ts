// Professional A4 QR PDF generator (4 cards per row), Cyrillic-safe
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { registerCyrillicFont } from "./pdf-fonts";

interface QrStudent {
  id: string;
  name: string;
  grade: string;
}

interface Options {
  students: QrStudent[];
  schoolName: string;
  logoSrc: string;
}

async function loadImageAsDataUrl(src: string): Promise<string> {
  // If already data URL, return as-is
  if (src.startsWith("data:")) return src;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no ctx"));
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateQrPdf({ students, schoolName, logoSrc }: Options) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  let fontName = "helvetica";
  try { fontName = await registerCyrillicFont(pdf); } catch (e) { console.warn("font fallback", e); }

  // A4 = 210 x 297 mm
  const pageW = 210;
  const pageH = 297;
  const margin = 10;
  const cols = 4;
  const rows = 5; // 20 cards per page
  const gap = 4;
  const cardW = (pageW - margin * 2 - gap * (cols - 1)) / cols;
  const cardH = (pageH - margin * 2 - gap * (rows - 1)) / rows;

  const logoData = await loadImageAsDataUrl(logoSrc);

  // Pre-generate all QR codes — payload is strictly [Prefix][Student ID]
  const qrValues: Record<string, string> = {};
  const qrDataUrls: Record<string, string> = {};
  for (const s of students) {
    const value = qrValueForStudent(s.id);
    qrValues[s.id] = value;
    qrDataUrls[s.id] = await QRCode.toDataURL(value, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 400,
    });
  }

  let perPage = cols * rows;
  for (let i = 0; i < students.length; i++) {
    if (i > 0 && i % perPage === 0) pdf.addPage();
    const idxOnPage = i % perPage;
    const col = idxOnPage % cols;
    const row = Math.floor(idxOnPage / cols);
    const x = margin + col * (cardW + gap);
    const y = margin + row * (cardH + gap);

    // Card border
    pdf.setDrawColor(180);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(x, y, cardW, cardH, 1.5, 1.5);

    const s = students[i];
    const innerPad = 2;

    // Top: school logo (small)
    const logoH = 8;
    try {
      pdf.addImage(logoData, "PNG", x + cardW / 2 - logoH / 2, y + innerPad, logoH, logoH);
    } catch {}

    // Center: QR
    const qrSize = Math.min(cardW - 4, cardH - 22);
    const qrX = x + (cardW - qrSize) / 2;
    const qrY = y + innerPad + logoH + 1;
    pdf.addImage(qrDataUrls[s.id], "PNG", qrX, qrY, qrSize, qrSize);

    // Bottom: name + class
    const textY = qrY + qrSize + 2.5;
    pdf.setFont(fontName, "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(20);
    const name = s.name.length > 28 ? s.name.slice(0, 27) + "…" : s.name;
    pdf.text(name, x + cardW / 2, textY, { align: "center", maxWidth: cardW - 2 });

    pdf.setFont(fontName, "normal");
    pdf.setFontSize(6);
    pdf.setTextColor(100);
    pdf.text(`${s.id} • ${s.grade}`, x + cardW / 2, textY + 3, { align: "center" });
  }

  // Header on each page
  const pageCount = pdf.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    pdf.setPage(p);
    pdf.setFont(fontName, "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.text(schoolName, pageW / 2, 6, { align: "center" });
    pdf.text(`${p} / ${pageCount}`, pageW - margin, 6, { align: "right" });
  }

  pdf.save(`QR_${schoolName.replace(/\s+/g, "_")}.pdf`);
}
