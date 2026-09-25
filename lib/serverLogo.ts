import fs from "fs";
import path from "path";

let cachedLogoDataUri: string | null = null;

/**
 * Server-safe loader for official TamizhTech Robotics Company (TTRC) logo.
 * Converts local PNG to base64 Data URI for deployment-safe PDF generation.
 */
export function getServerLogoDataUri(): string {
  if (cachedLogoDataUri) {
    return cachedLogoDataUri;
  }

  try {
    const candidates = [
      path.join(process.cwd(), "public", "assets", "ttrc-logo.png"),
      path.join(process.cwd(), "public", "logo.png"),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const buf = fs.readFileSync(p);
        cachedLogoDataUri = `data:image/png;base64,${buf.toString("base64")}`;
        return cachedLogoDataUri;
      }
    }
  } catch (err) {
    console.error("[SERVER_LOGO] Error loading logo for PDF:", err);
  }

// Fallback relative path
  return "/assets/ttrc-logo.png";
}

let cachedSignatureDataUri: string | null = null;

/**
 * Server-safe loader for official TamizhTech authorized signature.
 * Converts local PNG to base64 Data URI for deployment-safe PDF generation.
 */
export function getServerSignatureDataUri(): string {
  if (cachedSignatureDataUri) {
    return cachedSignatureDataUri;
  }

  try {
    const candidates = [
      path.join(process.cwd(), "public", "signature.png"),
      path.join(process.cwd(), "public", "assets", "signature.png"),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const buf = fs.readFileSync(p);
        cachedSignatureDataUri = `data:image/png;base64,${buf.toString("base64")}`;
        return cachedSignatureDataUri;
      }
    }
  } catch (err) {
    console.error("[SERVER_SIGNATURE] Error loading signature for PDF:", err);
  }

  return "/signature.png";
}

let cachedQrDataUri: string | null = null;

/**
 * Server-safe loader for official TamizhTech UPI QR code.
 * Converts local JPG/PNG to base64 Data URI for deployment-safe PDF generation.
 */
export function getServerQrDataUri(): string {
  if (cachedQrDataUri) {
    return cachedQrDataUri;
  }

  try {
    const candidates = [
      path.join(process.cwd(), "public", "qr.jpg"),
      path.join(process.cwd(), "public", "qr.png"),
      path.join(process.cwd(), "public", "assets", "qr.jpg"),
      path.join(process.cwd(), "public", "assets", "qr.png"),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const buf = fs.readFileSync(p);
        const mime = p.endsWith(".png") ? "image/png" : "image/jpeg";
        cachedQrDataUri = `data:${mime};base64,${buf.toString("base64")}`;
        return cachedQrDataUri;
      }
    }
  } catch (err) {
    console.error("[SERVER_QR] Error loading QR for PDF:", err);
  }

  return "/qr.jpg";
}

