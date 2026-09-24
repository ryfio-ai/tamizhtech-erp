import prisma from "../lib/prisma";

async function resetSubmissions() {
  console.log("🧹 Starting Complete Reset of Website Submissions & Leads...");

  // 1. Delete all submission events
  const delEvents = await prisma.submissionEvent.deleteMany({});
  console.log(`✓ Deleted ${delEvents.count} submission events.`);

  // 2. Delete all submission audit logs
  const delLogs = await prisma.submissionAuditLog.deleteMany({});
  console.log(`✓ Deleted ${delLogs.count} submission audit logs.`);

  // 3. Delete all inbound submissions
  const delSubs = await prisma.inboundSubmission.deleteMany({});
  console.log(`✓ Deleted ${delSubs.count} inbound submissions.`);

  // 4. Reset sequences for submissions to zero
  const seqNames = [
    "SUBMISSION_RFQ_2026",
    "SUBMISSION_CON_2026",
    "SUBMISSION_CAR_2026",
    "SUBMISSION_CLUB_2026",
  ];

  for (const name of seqNames) {
    await prisma.businessSequence.deleteMany({
      where: { name }
    });
    console.log(`✓ Reset sequence ${name} to 0 (deleted sequence record).`);
  }

  console.log("\n✅ All website leads reset to 0! Next inbound submission will be TTRC-RFQ-2026-0001.");
}

resetSubmissions()
  .catch((err) => {
    console.error("Error resetting submissions:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
