/**
 * Normalizes a product name for reliable search, matching, and duplicate protection.
 * - Trims whitespace
 * - Converts to lowercase
 * - Strips diacritical marks / accents
 * - Strips harmless punctuation and special symbols
 * - Collapses consecutive whitespace into a single space
 *
 * Example:
 * "TTRC DGJ 300RPM" -> "ttrc dgj 300rpm"
 * "  ttrc   dgj-300rpm  " -> "ttrc dgj 300rpm"
 */
export function normalizeProductName(name: string): string {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^\w\s]/g, " ") // replace harmless punctuation with space
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim();
}
