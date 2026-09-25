import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { processAllEligibleReminders } from "@/lib/reminderService";

export const revalidate = 0;

/**
 * Scheduled Cron Endpoint: /api/cron/reminders
 * 
 * Invoked by Vercel Cron or an external scheduled runner.
 * Protected by CRON_SECRET or an active administrator session.
 */
export async function GET(req: NextRequest) {
  return handleCronRequest(req);
}

export async function POST(req: NextRequest) {
  return handleCronRequest(req);
}

async function handleCronRequest(req: NextRequest) {
  // 1. Verify Authorization: CRON_SECRET or Admin Session
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : req.nextUrl.searchParams.get("key");

  let isAuthorized = false;

  if (cronSecret && providedSecret && cronSecret === providedSecret) {
    isAuthorized = true;
  } else {
    // Fallback: Check if active user session is Admin / Finance
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "FINANCE") {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Invalid or missing CRON_SECRET" },
      { status: 401 }
    );
  }

  try {
    const summary = await processAllEligibleReminders({ maxBatch: 100 });
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (error: any) {
    console.error("[Cron Reminder Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process reminders" },
      { status: 500 }
    );
  }
}
