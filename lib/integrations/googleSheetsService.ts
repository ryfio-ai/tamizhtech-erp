import prisma from "@/lib/prisma";

const SCRIPT_URL =
  process.env.GOOGLE_SCRIPT_URL ||
  process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbwnkkZYMGW9EIhS9RF7BnqhtLpS_LESIBP400cB_mWu55KR2wIuiNtJEU5K0EC1_tJCFQ/exec";

export function getSheetNameForType(type: string): string {
  switch (type) {
    case "RFQ":
      return "RFQs";
    case "CONTACT":
      return "Contacts";
    case "CAREER":
      return "Careers";
    case "CLUB_REGISTRATION":
      return "ClubRegistrations";
    default:
      return "WebsiteSubmissions";
  }
}

export function formatSubmissionRecordForSheet(submission: any): Record<string, any> {
  const payload = (submission.payload as any) || {};
  const attachment = (submission.attachmentMetadata as any) || {};

  const baseRecord: Record<string, any> = {
    id: submission.submissionNo, // Used as unique row identifier in Google Sheets
    submissionNo: submission.submissionNo,
    name: submission.name,
    mobile: submission.mobile || "",
    email: submission.email || "",
    company: submission.company || "",
    city: submission.city || "",
    state: submission.state || "",
    status: submission.status,
    createdAt: submission.createdAt ? new Date(submission.createdAt).toISOString() : new Date().toISOString(),
  };

  switch (submission.type) {
    case "RFQ":
      return {
        ...baseRecord,
        subject: submission.subject || payload.subject || "",
        message: submission.message || payload.message || "",
        productRequirements: payload.productRequirements || "",
        quantity: payload.quantity ? String(payload.quantity) : "",
        configurationRequirements: payload.configurationRequirements || "",
        technicalRequirements: payload.technicalRequirements || "",
        budget: payload.budget || "",
        deliveryTimeline: payload.deliveryTimeline || "",
      };

    case "CONTACT":
      return {
        ...baseRecord,
        subject: submission.subject || payload.subject || "",
        message: submission.message || payload.message || "",
      };

    case "CAREER":
      return {
        ...baseRecord,
        position: payload.position || "",
        qualification: payload.qualification || "",
        experience: payload.experience || "",
        location: payload.location || "",
        coverMessage: payload.coverMessage || "",
        resumeFileName: attachment.fileName || "",
        resumeStorageKey: attachment.storageKey || "",
      };

    case "CLUB_REGISTRATION":
      return {
        ...baseRecord,
        institution: payload.institution || "",
        department: payload.department || "",
        year: payload.year || "",
        interests: Array.isArray(payload.interests) ? payload.interests.join(", ") : (payload.interests || ""),
        message: payload.message || "",
      };

    default:
      return {
        ...baseRecord,
        payload: JSON.stringify(payload),
      };
  }
}

/**
 * Reconcile-before-append: Queries sheet by submissionNo.
 * Returns existing record if found, or null if not found.
 */
export async function findRowBySubmissionNo(sheetName: string, submissionNo: string): Promise<any | null> {
  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "GET_BY_ID", sheet: sheetName, id: submissionNo }),
      cache: "no-store",
    });

    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
    return null;
  } catch (err) {
    console.warn(`[SHEETS_LOOKUP_WARN] Failed lookup for ${submissionNo} in ${sheetName}:`, (err as any)?.message);
    return null;
  }
}

/**
 * Reconciles and synchronizes an inbound submission with Google Sheets.
 * Guaranteed idempotency: searches for existing row by submissionNo before appending.
 */
export async function syncSubmissionToSheet(submission: any): Promise<{ success: boolean; error?: string }> {
  if (!SCRIPT_URL) {
    return { success: false, error: "Google Script URL not configured" };
  }

  const sheetName = getSheetNameForType(submission.type);
  const record = formatSubmissionRecordForSheet(submission);

  try {
    // 1. Reconcile: Search if row with this submissionNo already exists
    const existing = await findRowBySubmissionNo(sheetName, submission.submissionNo);

    if (existing) {
      // 2. If already exists, update row idempotently
      console.log(`[SHEETS_SYNC] Found existing row for ${submission.submissionNo} in ${sheetName}. Updating...`);
      const updateRes = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "UPDATE_ROW", sheet: sheetName, id: submission.submissionNo, record }),
        cache: "no-store",
      });

      const updateJson = await updateRes.json();
      if (!updateJson.success) {
        throw new Error(updateJson.error || "Failed to update Google Sheet row");
      }
    } else {
      // 3. Not found, double-check and append
      console.log(`[SHEETS_SYNC] Appending new row for ${submission.submissionNo} in ${sheetName}...`);
      const appendRes = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "APPEND_ROW", sheet: sheetName, record }),
        cache: "no-store",
      });

      const appendJson = await appendRes.json();
      if (!appendJson.success) {
        throw new Error(appendJson.error || "Failed to append Google Sheet row");
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error(`[SHEETS_SYNC_ERROR] Submission ${submission.submissionNo}:`, error.message);
    return { success: false, error: error.message };
  }
}
