/**
 * Tiny QR-code renderer using the browser's built-in canvas.
 * Encodes a string into a QR-code data matrix using a minimal Reed-Solomon
 * implementation, then draws it onto a supplied canvas element.
 *
 * We use the `qrcodegen` library bundled inline via a CDN import so we
 * don't need a npm package. If the CDN is unavailable the QR canvas just
 * stays blank (non-fatal).
 *
 * Usage:
 *   import { drawQr, memberQrData } from './qr.js';
 *   await drawQr(canvas, memberQrData(member), { size: 200 });
 */

let QrGen = null;

async function loadQrLib() {
  if (QrGen) return QrGen;
  try {
    // qrcodegen is a pure-JS library with no dependencies, ~15KB minified.
    const mod = await import("https://cdn.jsdelivr.net/npm/qrcodegen@1.8.0/+esm");
    QrGen = mod;
    return QrGen;
  } catch {
    return null;
  }
}

/** Canonical data string encoded in a member's QR code. */
export function memberQrData(member) {
  return JSON.stringify({
    id: member.id,
    name: member.name,
    role: member.role,
    group: "NYISH",
  });
}

/**
 * Draw a QR code onto a canvas element.
 * @param {HTMLCanvasElement} canvas
 * @param {string} text
 * @param {{ size?: number, fg?: string, bg?: string }} opts
 */
export async function drawQr(canvas, text, { size = 200, fg = "#6B3A28", bg = "#F7F2E4" } = {}) {
  const lib = await loadQrLib();
  if (!lib) return;

  const { QrCode, Ecc } = lib;
  const qr = QrCode.encodeText(text, Ecc.MEDIUM);
  const modules = qr.size;
  const scale = Math.floor(size / modules);
  const actualSize = modules * scale;

  canvas.width = actualSize;
  canvas.height = actualSize;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, actualSize, actualSize);
  ctx.fillStyle = fg;

  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      if (qr.getModule(x, y)) {
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }
}

/**
 * Parse a scanned QR code payload back into a member-identity object,
 * or return null if the payload isn't a valid NYISH QR code.
 */
export function parseQrPayload(raw) {
  try {
    const obj = JSON.parse(raw);
    if (obj?.group === "NYISH" && obj?.id) return obj;
    return null;
  } catch {
    return null;
  }
}
