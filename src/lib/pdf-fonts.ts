// Lazy loader for a Cyrillic-capable TTF, registered into a jsPDF instance.
// Uses jsDelivr's mirror of googlefonts/noto-fonts (NotoSans-Regular.ttf, ~520KB).
import type jsPDF from "jspdf";

const FONT_URL =
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/hinted/ttf/NotoSans/NotoSans-Regular.ttf";
const FONT_URL_BOLD =
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/hinted/ttf/NotoSans/NotoSans-Bold.ttf";

let cached: { regular: string; bold: string } | null = null;

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`font fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  // chunk to avoid stack overflow on big buffers
  const bytes = new Uint8Array(buf);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(bin);
}

export async function registerCyrillicFont(pdf: jsPDF): Promise<string> {
  if (!cached) {
    const [regular, bold] = await Promise.all([
      fetchAsBase64(FONT_URL),
      fetchAsBase64(FONT_URL_BOLD),
    ]);
    cached = { regular, bold };
  }
  pdf.addFileToVFS("NotoSans-Regular.ttf", cached.regular);
  pdf.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  pdf.addFileToVFS("NotoSans-Bold.ttf", cached.bold);
  pdf.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
  return "NotoSans";
}
