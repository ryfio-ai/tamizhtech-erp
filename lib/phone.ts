/**
 * TAMIZHTECH ERP 2.0 — CANONICAL PHONE NORMALIZATION & VALIDATION
 * 
 * Enforces E.164 international standard formatting:
 * - Indian mobile numbers (10 digits starting with 6-9, with or without +91/91/0):
 *   9876543210 -> +919876543210
 *   +91 9876543210 -> +919876543210
 *   +91-9876543210 -> +919876543210
 *   91 9876543210 -> +919876543210
 *   09876543210 -> +919876543210
 * - International numbers (preserving valid country codes, e.g. Sri Lanka, US, UK, Singapore):
 *   +94769903781 -> +94769903781
 *   +94 76 990 3781 -> +94769903781
 *   0094769903781 -> +94769903781
 */

/**
 * Normalizes any phone number into canonical E.164 (+<country_code><number>)
 */
export function normalizeMobile(phone: string | null | undefined): string {
  if (!phone) return "";

  // 1. Remove all spaces, hyphens, parentheses, dots
  let cleaned = String(phone).trim().replace(/[\s\-\(\)\.]/g, "");

  if (!cleaned) return "";

  // 2. Convert international access code 00 to +
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }

  // 3. Indian phone normalization:
  // Case A: 10 digits starting with 6-9
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  // Case B: 11 digits starting with 0 followed by 10 digits starting with 6-9 (trunk prefix)
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned.slice(1)}`;
  }

  // Case C: 12 digits starting with 91 followed by 10 digits starting with 6-9 (country code without +)
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // Case D: Already starting with +91 followed by 10 digits starting with 6-9
  if (/^\+91[6-9]\d{9}$/.test(cleaned)) {
    return cleaned;
  }

  // 4. International numbers already having '+' prefix
  if (cleaned.startsWith("+")) {
    const digitsOnly = cleaned.slice(1).replace(/\D/g, "");
    if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
      return `+${digitsOnly}`;
    }
  }

  // 5. International numbers without '+' (8 to 15 digits)
  const digitsOnly = cleaned.replace(/\D/g, "");
  if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
    return `+${digitsOnly}`;
  }

  // Fallback: return cleaned digits with + if available
  return cleaned.startsWith("+") ? `+${digitsOnly}` : digitsOnly;
}

/**
 * Validates whether a phone number resolves to a valid, dialable mobile number.
 */
export function isValidMobile(phone: string | null | undefined): boolean {
  if (!phone) return false;

  const normalized = normalizeMobile(phone);
  if (!normalized || !normalized.startsWith("+")) return false;

  const digits = normalized.slice(1);
  // ITU-T E.164 specification: max 15 digits, min 7 digits
  if (digits.length < 8 || digits.length > 15) return false;

  // If Indian country code (+91), must have 10 digits starting with 6, 7, 8, or 9
  if (normalized.startsWith("+91")) {
    const nationalNumber = normalized.slice(3);
    return /^[6-9]\d{9}$/.test(nationalNumber);
  }

  // General international validation (only digits following +)
  return /^\d{8,15}$/.test(digits);
}

/**
 * Formats a normalized phone number for clean UI display.
 */
export function formatDisplayMobile(phone: string | null | undefined): string {
  if (!phone) return "-";
  const normalized = normalizeMobile(phone);

  if (normalized.startsWith("+91") && normalized.length === 13) {
    // Format: +91 98765 43210
    const p = normalized.slice(3);
    return `+91 ${p.slice(0, 5)} ${p.slice(5)}`;
  }

  return normalized || phone;
}
