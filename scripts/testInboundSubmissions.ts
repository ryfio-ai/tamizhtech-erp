import prisma from "../lib/prisma";
import crypto from "crypto";
import { cleanupExpiredUploads } from "../lib/storage/submissionStorage";
import { claimEventForProcessing } from "../lib/outbox/submissionOutbox";
import { getErpPublicUrl } from "../lib/email/submissionEmails";

const BASE_URL = process.env.APP_URL || "http://localhost:3000";


interface TestReport {
  testNumber: number | string;
  description: string;
  passed: boolean;
  details?: string;
}

const report: TestReport[] = [];

function recordTest(testNumber: number | string, description: string, passed: boolean, details?: string) {
  report.push({ testNumber, description, passed, details });
  const icon = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`[TEST ${testNumber}] ${icon} - ${description} ${details ? `(${details})` : ""}`);
  if (!passed) {
    throw new Error(`Test ${testNumber} failed: ${description} - ${details}`);
  }
}

async function cleanupSyntheticData() {
  console.log("Cleaning up synthetic test records...");
  const deletedSubs = await prisma.inboundSubmission.deleteMany({
    where: {
      name: { startsWith: "TEST-SYNTH" },
    },
  });

  const deletedClients = await prisma.client.deleteMany({
    where: {
      name: { startsWith: "TEST-SYNTH" },
    },
  });

  const deletedUploads = await prisma.pendingAttachment.deleteMany({
    where: {
      idempotencyKey: { startsWith: "synth-" },
    },
  });

  console.log(`Cleaned up ${deletedSubs.count} submissions, ${deletedClients.count} clients, ${deletedUploads.count} uploads.`);
}

async function runInboundSubmissionTests() {
  console.log("===============================================================");
  console.log("TAMIZHTECH ERP 2.0 — INBOUND SUBMISSION & INTEGRATION TEST SUITE");
  console.log("===============================================================\n");

  await cleanupSyntheticData();

  try {
    // -------------------------------------------------------------
    // TEST 1: Valid RFQ Submission
    // -------------------------------------------------------------
    console.log("\nRunning TEST 1: Valid RFQ Submission...");
    const rfqKey = `synth-rfq-${crypto.randomBytes(8).toString("hex")}`;
    const rfqPayload = {
      name: "TEST-SYNTH Industrial Client",
      mobile: "9876599901",
      email: "synth_rfq@example.com",
      company: "TEST-SYNTH Automations Ltd",
      city: "Coimbatore",
      state: "Tamil Nadu",
      productRequirements: "6-Axis Articulated Welding Robot",
      quantity: 2,
      budget: "INR 20 Lakhs",
      deliveryTimeline: "4 Weeks",
    };
    const rfqRes = await fetch(`${BASE_URL}/api/public/v1/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "RFQ",
        idempotencyKey: rfqKey,
        payload: rfqPayload,
      }),
    });

    const rfqJson = await rfqRes.json();
    const rfqPassed = rfqRes.status === 201 && rfqJson.success && rfqJson.submissionNo?.startsWith("TTRC-RFQ-");
    recordTest(1, "Valid RFQ Submission (HTTP 201 & TTRC-RFQ-YYYY-XXXX)", rfqPassed, rfqJson.submissionNo);

    // -------------------------------------------------------------
    // TEST 2: Valid Contact Submission + Server-Controlled Source
    // -------------------------------------------------------------
    console.log("\nRunning TEST 2: Valid Contact Submission & Source Control...");
    const contactKey = `synth-con-${crypto.randomBytes(8).toString("hex")}`;
    const contactRes = await fetch(`${BASE_URL}/api/public/v1/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "CONTACT",
        idempotencyKey: contactKey,
        source: "SPOOFED_UNAUTHORIZED_PARTNER", // Client tries to spoof source
        payload: {
          name: "TEST-SYNTH Contact Inquirer",
          mobile: "9876599902",
          email: "synth_contact@example.com",
          subject: "Robotics Workshop",
          message: "Requesting quote for faculty development program.",
        },
      }),
    });

    const contactJson = await contactRes.json();
    const contactDb = await prisma.inboundSubmission.findUnique({ where: { idempotencyKey: contactKey } });
    const sourceControlled = contactDb?.source === "WEBSITE";
    const contactPassed = contactRes.status === 201 && contactJson.success && Boolean(sourceControlled);
    recordTest(2, "Valid Contact Submission & Server-Controlled Source ('WEBSITE')", contactPassed, `source: ${contactDb?.source}`);

    // -------------------------------------------------------------
    // TEST 3: Private Resume Upload API with Idempotency Key Association
    // -------------------------------------------------------------
    console.log("\nRunning TEST 3: Private Resume Upload via /api/public/v1/uploads...");
    const careerKey = `synth-car-${crypto.randomBytes(8).toString("hex")}`;
    const formData = new FormData();
    const testPdfContent = Buffer.from("%PDF-1.4 test resume content for tamizhtech erp");
    const testBlob = new Blob([testPdfContent], { type: "application/pdf" });
    formData.append("file", testBlob, "Sathish_Test_Resume.pdf");
    formData.append("idempotencyKey", careerKey);

    const uploadRes = await fetch(`${BASE_URL}/api/public/v1/uploads`, {
      method: "POST",
      body: formData,
    });

    const uploadJson = await uploadRes.json();
    const uploadPassed = uploadRes.status === 201 && uploadJson.success && Boolean(uploadJson.attachment?.storageKey);
    const uploadedStorageKey = uploadJson.attachment?.storageKey;
    recordTest(3, "Private Resume Upload (HTTP 201 & storageKey issued)", uploadPassed, uploadedStorageKey);

    // -------------------------------------------------------------
    // TEST 4: Valid Career Submission Claiming the Upload
    // -------------------------------------------------------------
    console.log("\nRunning TEST 4: Career Submission Claiming Private Resume...");
    const careerRes = await fetch(`${BASE_URL}/api/public/v1/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "CAREER",
        idempotencyKey: careerKey,
        payload: {
          name: "TEST-SYNTH Robotics Engineer",
          mobile: "9876599903",
          email: "synth_engineer@example.com",
          position: "Robotics Firmware Lead",
          qualification: "M.Tech Mechatronics",
          experience: "5 Years",
          attachmentMetadata: uploadJson.attachment,
        },
      }),
    });

    const careerJson = await careerRes.json();
    const careerDb = await prisma.inboundSubmission.findUnique({ where: { idempotencyKey: careerKey } });
    const pendingDb = await prisma.pendingAttachment.findUnique({ where: { storageKey: uploadedStorageKey } });
    const careerPassed = careerRes.status === 201 && careerJson.success && pendingDb?.status === "ATTACHED";
    recordTest(4, "Career Submission Claims Upload (PendingAttachment -> ATTACHED)", careerPassed, careerJson.submissionNo);

    // -------------------------------------------------------------
    // TEST 5: Upload Reuse / Hijacking Prevention
    // -------------------------------------------------------------
    console.log("\nRunning TEST 5: Upload Reuse Prevention across different submissions...");
    const hijackerKey = `synth-hijack-${crypto.randomBytes(8).toString("hex")}`;
    const hijackRes = await fetch(`${BASE_URL}/api/public/v1/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "CAREER",
        idempotencyKey: hijackerKey, // Different key
        payload: {
          name: "TEST-SYNTH Hijacker Applicant",
          mobile: "9876599988",
          email: "synth_hijack@example.com",
          position: "Robotics Firmware Lead",
          attachmentMetadata: {
            ...uploadJson.attachment,
            storageKey: uploadedStorageKey, // Trying to reuse or steal someone else's upload
          },
        },
      }),
    });

    const hijackJson = await hijackRes.json();
    const hijackRejected = hijackRes.status === 400 && hijackJson.success === false;
    recordTest(5, "Upload Reuse Prevention (Rejected with HTTP 400)", hijackRejected, hijackJson.error);

    // -------------------------------------------------------------
    // TEST 6: Unauthorized Resume Download Rejected
    // -------------------------------------------------------------
    console.log("\nRunning TEST 6: Unauthorized Resume Download Access Check...");
    const downloadRes = await fetch(`${BASE_URL}/api/submissions/${careerDb!.id}/attachment/${uploadedStorageKey}`);
    const downloadRejected = downloadRes.status === 401;
    recordTest(6, "Unauthorized Resume Download Rejected (HTTP 401)", downloadRejected);

    // -------------------------------------------------------------
    // TEST 7: Valid Club Registration Submission
    // -------------------------------------------------------------
    console.log("\nRunning TEST 7: Valid Club Registration Submission...");
    const clubKey = `synth-club-${crypto.randomBytes(8).toString("hex")}`;
    const clubRes = await fetch(`${BASE_URL}/api/public/v1/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "CLUB_REGISTRATION",
        idempotencyKey: clubKey,
        payload: {
          name: "TEST-SYNTH Student Member",
          mobile: "9876599904",
          email: "synth_student@example.com",
          institution: "Coimbatore Institute of Technology",
          department: "Mechatronics",
          year: "3rd Year",
          interests: ["Autonomous Drones", "Mobile Robots"],
        },
      }),
    });

    const clubJson = await clubRes.json();
    const clubPassed = clubRes.status === 201 && clubJson.success && clubJson.submissionNo?.startsWith("TTRC-CLUB-");
    recordTest(7, "Valid Club Registration (HTTP 201 & TTRC-CLUB-YYYY-XXXX)", clubPassed, clubJson.submissionNo);

    // -------------------------------------------------------------
    // TEST 8: Sequential Idempotency Retry
    // -------------------------------------------------------------
    console.log("\nRunning TEST 8: Sequential Idempotency Retry...");
    const dupRes = await fetch(`${BASE_URL}/api/public/v1/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "RFQ",
        idempotencyKey: rfqKey, // Same key as Test 1
        payload: rfqPayload,
      }),
    });

    const dupJson = await dupRes.json();
    const dupPassed = dupRes.status === 200 && dupJson.isDuplicate === true && dupJson.submissionNo === rfqJson.submissionNo;
    const dbCount = await prisma.inboundSubmission.count({ where: { idempotencyKey: rfqKey } });
    recordTest(8, "Sequential Idempotency (HTTP 200, matching submissionNo, single DB record)", dupPassed && dbCount === 1);

    // -------------------------------------------------------------
    // TEST 8B: Idempotency Key Reuse with DIFFERENT Payload -> EXPECT HTTP 409
    // -------------------------------------------------------------
    console.log("\nRunning TEST 8B: Idempotency Key Reuse with DIFFERENT Payload...");
    const mismatchRes = await fetch(`${BASE_URL}/api/public/v1/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "RFQ",
        idempotencyKey: rfqKey, // Same key as Test 1
        payload: {
          name: "TEST-SYNTH Completely Different Customer",
          mobile: "9876599999",
          email: "different_payload@example.com",
          productRequirements: "Completely Different Requirements",
        },
      }),
    });

    const mismatchJson = await mismatchRes.json();
    const mismatchPassed =
      mismatchRes.status === 409 &&
      mismatchJson.success === false &&
      mismatchJson.code === "IDEMPOTENCY_KEY_REUSE";

    recordTest(
      "8B" as any,
      "Idempotency Key Reuse with Different Payload (HTTP 409 & IDEMPOTENCY_KEY_REUSE)",
      mismatchPassed,
      mismatchJson.error
    );

    // -------------------------------------------------------------
    // TEST 8C: Rate Limiting Enforcement (10 req/min allowed, 11th request HTTP 429)
    // -------------------------------------------------------------
    console.log("\nRunning TEST 8C: Rate Limiting Enforcement (10 req/min limit per IP)...");
    const testRateIp = "203.0.113.195";
    let allowedCount = 0;
    let blockedCount = 0;
    let rateLimitErrorCode = "";

    for (let i = 1; i <= 11; i++) {
      const rKey = `synth-rate-${i}-${Date.now()}`;
      const rRes = await fetch(`${BASE_URL}/api/public/v1/submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": testRateIp,
        },
        body: JSON.stringify({
          type: "RFQ",
          idempotencyKey: rKey,
          payload: {
            name: `TEST-SYNTH Rate Customer ${i}`,
            mobile: `98765010${i < 10 ? "0" + i : i}`,
            email: `rate${i}@example.com`,
            productRequirements: `Rate Test Robot ${i}`,
          },
        }),
      });

      if (rRes.status === 201) {
        allowedCount++;
      } else if (rRes.status === 429) {
        blockedCount++;
        const bJson = await rRes.json();
        rateLimitErrorCode = bJson.code || "";
      }
    }

    const ratePassed = allowedCount === 10 && blockedCount === 1 && rateLimitErrorCode === "RATE_LIMIT_EXCEEDED";
    recordTest(
      "8C" as any,
      "Rate Limiting Enforcement (10 requests allowed, 11th rejected with HTTP 429)",
      ratePassed,
      `Allowed: ${allowedCount}, Blocked: ${blockedCount}, Code: ${rateLimitErrorCode}`
    );

    // -------------------------------------------------------------
    // TEST 9: Concurrent Race Condition Idempotency (5 simultaneous requests)
    // -------------------------------------------------------------
    console.log("\nRunning TEST 9: Concurrent Race Condition Idempotency (5 simultaneous requests)...");
    const concurrentKey = `synth-conc-${crypto.randomBytes(8).toString("hex")}`;
    const makeReq = () =>
      fetch(`${BASE_URL}/api/public/v1/submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.91",
        },
        body: JSON.stringify({
          type: "RFQ",
          idempotencyKey: concurrentKey,
          payload: {
            name: "TEST-SYNTH Concurrent Customer",
            mobile: "9876599905",
            email: "synth_conc@example.com",
            productRequirements: "Automated Guided Vehicle",
          },
        }),
      }).then((r) => r.json());

    const concurrentResults = await Promise.all([makeReq(), makeReq(), makeReq(), makeReq(), makeReq()]);
    const allSuccessful = concurrentResults.every((r) => r.success);
    const uniqueSubmissionNos = new Set(concurrentResults.map((r) => r.submissionNo));
    const concurrentDbCount = await prisma.inboundSubmission.count({ where: { idempotencyKey: concurrentKey } });

    recordTest(
      9,
      "Concurrent Idempotency (All 5 requests succeed, exactly 1 DB record created, zero collisions)",
      allSuccessful && uniqueSubmissionNos.size === 1 && concurrentDbCount === 1,
      `SubmissionNo: ${Array.from(uniqueSubmissionNos)[0]}`
    );

    // -------------------------------------------------------------
    // TEST 10: Payload Validation & Safe Error Response
    // -------------------------------------------------------------
    console.log("\nRunning TEST 10: Invalid Payload (Missing contact info)...");
    const invalidRes = await fetch(`${BASE_URL}/api/public/v1/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.92",
      },
      body: JSON.stringify({
        type: "RFQ",
        idempotencyKey: `synth-inv-${crypto.randomBytes(8).toString("hex")}`,
        payload: {
          name: "A", // too short
        },
      }),
    });

    const invalidJson = await invalidRes.json();
    const invalidPassed = invalidRes.status === 400 && invalidJson.success === false && typeof invalidJson.error === "string";
    recordTest(10, "Validation Error Rejection (HTTP 400 & Safe Error Message)", invalidPassed, invalidJson.error);

    // -------------------------------------------------------------
    // TEST 11: Authoritative Outbox Events in MongoDB
    // -------------------------------------------------------------
    console.log("\nRunning TEST 11: Outbox Events Verification in MongoDB...");
    const subRecord = await prisma.inboundSubmission.findUnique({
      where: { submissionNo: rfqJson.submissionNo },
      include: { events: true },
    });

    const hasEvents = subRecord && subRecord.events.length === 2;
    const eventTypes = subRecord ? subRecord.events.map((e) => e.eventType).sort() : [];
    const eventsMatch = JSON.stringify(eventTypes) === JSON.stringify(["ADMIN_EMAIL", "CUSTOMER_EMAIL"]);
    recordTest(11, "Authoritative Outbox Events Created (CUSTOMER_EMAIL, ADMIN_EMAIL)", Boolean(hasEvents && eventsMatch));

    // -------------------------------------------------------------
    // TEST 11B: Stale PROCESSING Outbox Event Lease Recovery
    // -------------------------------------------------------------
    console.log("\nRunning TEST 11B: Stale Outbox Event Recovery & PROCESSED Immutability...");
    const staleDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
    await prisma.submissionEvent.update({
      where: {
        submissionId_eventType: {
          submissionId: subRecord!.id,
          eventType: "ADMIN_EMAIL",
        },
      },
      data: {
        status: "PROCESSING",
        lastAttemptAt: staleDate,
      },
    });

    // 1. Should successfully claim stale PROCESSING event
    const claimedStale = await claimEventForProcessing(subRecord!.id, "ADMIN_EMAIL", 5 * 60 * 1000);

    // 2. Mark as PROCESSED
    await prisma.submissionEvent.update({
      where: {
        submissionId_eventType: {
          submissionId: subRecord!.id,
          eventType: "ADMIN_EMAIL",
        },
      },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
      },
    });

    // 3. Should reject claiming an already PROCESSED event
    const claimedProcessed = await claimEventForProcessing(subRecord!.id, "ADMIN_EMAIL");

    const outboxPassed = claimedStale === true && claimedProcessed === false;
    recordTest(
      "11B" as any,
      "Stale Event Lease Recovery (Stale reclaimed, PROCESSED never re-dispatched)",
      outboxPassed,
      `Stale claimed: ${claimedStale}, Processed claimed: ${claimedProcessed}`
    );

    // -------------------------------------------------------------
    // TEST 12: Abandoned Upload Cleanup Policy
    // -------------------------------------------------------------
    console.log("\nRunning TEST 12: Abandoned Upload Cleanup Policy...");
    const expiredStorageKey = `synth_expired_${Date.now()}.pdf`;
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 3); // Expired 3 hours ago

    await prisma.pendingAttachment.create({
      data: {
        storageKey: expiredStorageKey,
        idempotencyKey: "synth-expired-key",
        fileName: "abandoned_resume.pdf",
        mimeType: "application/pdf",
        size: 50000,
        status: "PENDING",
        expiresAt: pastDate,
      },
    });

    const cleanupRes = await cleanupExpiredUploads();
    const expiredRecord = await prisma.pendingAttachment.findUnique({ where: { storageKey: expiredStorageKey } });
    const attachedRecord = await prisma.pendingAttachment.findUnique({ where: { storageKey: uploadedStorageKey } });

    const cleanupPassed = expiredRecord?.status === "EXPIRED" && attachedRecord?.status === "ATTACHED";
    recordTest(12, "Abandoned Upload Cleanup (Expired purged, attached preserved)", Boolean(cleanupPassed), `Cleaned: ${cleanupRes.cleanedCount}`);

    // -------------------------------------------------------------
    // TEST 13: RFQ Conversion to Customer
    // -------------------------------------------------------------
    console.log("\nRunning TEST 13: RFQ Conversion to Customer...");
    const testClient = await prisma.client.create({
      data: {
        clientCode: `TEST-CL-${Date.now().toString().slice(-4)}`,
        name: "TEST-SYNTH Industrial Client",
        phone: "9876599901",
        mobileNormalized: "9876599901",
        status: "ACTIVE",
      },
    });

    await prisma.inboundSubmission.update({
      where: { id: subRecord!.id },
      data: { clientId: testClient.id, status: "CONVERTED" },
    });

    const updatedSub = await prisma.inboundSubmission.findUnique({ where: { id: subRecord!.id } });
    const convertPassed = Boolean(updatedSub?.status === "CONVERTED" && updatedSub?.clientId === testClient.id);
    recordTest(13, "RFQ Conversion (Linked to Customer & status = CONVERTED)", convertPassed);

    // -------------------------------------------------------------
    // TEST 14: Environment-Driven ERP Admin URL
    // -------------------------------------------------------------
    console.log("\nRunning TEST 14: Environment-Driven ERP Admin URL...");
    const resolvedUrl = getErpPublicUrl();
    const noHardcodedVercel = !resolvedUrl.includes("tamizhtech-erp.vercel.app");
    const validUrlStructure = resolvedUrl.startsWith("http://") || resolvedUrl.startsWith("https://");
    const erpUrlPassed = noHardcodedVercel && validUrlStructure;

    recordTest(
      14,
      "Environment-Driven ERP Admin URL (Uses ERP_PUBLIC_URL, no hardcoded Vercel hostname)",
      erpUrlPassed,
      `Resolved URL: ${resolvedUrl}`
    );

    console.log("\n===============================================================");
    console.log("ALL INBOUND SUBMISSION, IDEMPOTENCY & LEASE RECOVERY TESTS PASSED!");
    console.log("===============================================================");
  } finally {
    await cleanupSyntheticData();
  }
}

runInboundSubmissionTests()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
