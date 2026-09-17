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
