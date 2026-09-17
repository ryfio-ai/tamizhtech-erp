/**
 * Indian Standard Time (IST - UTC+5:30) Utility for TamizhTech ERP.
 * Enforces authoritative Indian Standard Time across all bills, quotations,
 * invoices, financial reports, PDF documents, and UI timestamps.
 */

export const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Formats date into Indian Standard Time (e.g. "17 Sep 2026").
 */
export function formatISTDate(
  date: Date | string | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "-";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(d);
}

/**
 * Formats date and time into Indian Standard Time with AM/PM (e.g. "17 Sep 2026, 07:34 PM IST").
 */
export function formatISTDateTime(
  date: Date | string | number | null | undefined,
  includeZoneName: boolean = true
): string {
  if (!date) return "-";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  const formatted = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);

  return includeZoneName ? `${formatted} IST` : formatted;
}

/**
 * Formats time only into Indian Standard Time (e.g. "07:34 PM IST").
 */
export function formatISTTime(
  date: Date | string | number | null | undefined,
  includeZoneName: boolean = true
): string {
  if (!date) return "-";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  const formatted = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);

  return includeZoneName ? `${formatted} IST` : formatted;
}

/**
 * Returns ISO date string (YYYY-MM-DD) based on current Indian Standard Time.
 */
export function getISTTodayString(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  return `${year}-${month}-${day}`;
}
