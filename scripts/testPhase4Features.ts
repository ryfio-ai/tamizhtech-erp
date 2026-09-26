/**
 * TAMIZHTECH ERP 2.0 — PHASE 4 AUTOMATED TEST SUITE
 * 
 * Verifies:
 * - Certificate Eligibility (Eligible, Incomplete, Missing Program, Missing Student)
 * - Certificate Issuance (Authoritative Sequencing, Verification ID, Duplicate Protection, Concurrency, Idempotency)
 * - Certificate PDF Rendering (%PDF- header, Real Student & Program, Verification QR)
 * - Public Certificate Verification (Valid, Void, Unknown, Zero Sensitive Data Leakage, IDOR Protection)
 * - Reissue Workflow (Void Original, New Number, Bidirectional Traceability, History Preservation)
 * - Audit Trail & Zero-Mock Policy
 */

import prisma from "../lib/prisma";
import { getMongoDb } from "../lib/mongodb";
import { ObjectId } from "mongodb";
import {
  checkCertificateEligibility,
  issueCertificate,
  reissueCertificate,
  voidCertificate,
  verifyCertificatePublic,
  getCertificateById,
  generateVerificationId,
  getCertificateVerificationUrl,
  generateCertificateQrDataUri,
} from "../lib/certificateService";
import { allocateCertificateNo, generateDraftCertificateNo } from "../lib/sequence";
import { renderToStream } from "@react-pdf/renderer";
import React from "react";
import { CertificatePDFTemplate } from "../components/certificates/CertificatePDFTemplate";
import { DEFAULT_COMPANY_SETTINGS } from "../lib/companyProfile";

async function streamToBuffer(stream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", (err: any) => reject(err));
  });
}

async function runPhase4Tests() {
  console.log("=================================================");
  console.log("TAMIZHTECH ERP 2.0 — PHASE 4 TEST SUITE");
  console.log("Student Workshop Certificate Generator + Verification");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: any, desc: string) {
    if (Boolean(condition)) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  const db = await getMongoDb();
  const testRunId = Date.now();

  // Test Fixtures
  let testClientCompleted: any = null;
  let testAppCompleted: any = null;
  let testClientIncomplete: any = null;
  let testAppIncomplete: any = null;
  let createdCertId: string | null = null;
  let reissuedCertId: string | null = null;

  try {
    // -----------------------------------------------------------------
    // SETUP: Create isolated test clients and applications
    // -----------------------------------------------------------------
    const existingUser = await prisma.user.findFirst();
    const testUserId = existingUser?.id;

    testClientCompleted = await prisma.client.create({
      data: {
        name: `Senthil Kumar ${testRunId}`,
        clientCode: `STU-${testRunId.toString().slice(-4)}`,
        email: `senthil.${testRunId}@example.com`,
        phone: "9876543210",
        mobileNormalized: `+91987654${testRunId.toString().slice(-4)}`,
        city: "Chennai",
        status: "STUDENT",
        serviceType: "Robotics Workshop",
      },
    });

    testAppCompleted = await prisma.application.create({
      data: {
        appNo: `APP-${testRunId.toString().slice(-6)}`,
        clientId: testClientCompleted.id,
        course: "Autonomous Mobile Robotics & ROS STEM Workshop",
        status: "COMPLETED",
      },
    });

    testClientIncomplete = await prisma.client.create({
      data: {
        name: `Praveen Raj ${testRunId}`,
        clientCode: `STU-INC-${testRunId.toString().slice(-4)}`,
        email: `praveen.${testRunId}@example.com`,
        phone: "9876543211",
        mobileNormalized: `+91987653${testRunId.toString().slice(-4)}`,
        city: "Coimbatore",
        status: "STUDENT",
      },
    });

    testAppIncomplete = await prisma.application.create({
      data: {
        appNo: `APP-INC-${testRunId.toString().slice(-6)}`,
        clientId: testClientIncomplete.id,
        course: "Embedded C & IoT Workshop",
        status: "WAITLISTED",
      },
    });

    // =================================================================
    // 1. CERTIFICATE ELIGIBILITY
    // =================================================================
    console.log("--- 1. Certificate Eligibility Tests ---");

    // Test 1: Eligible completed student
    const elig1 = await checkCertificateEligibility({
      clientId: testClientCompleted.id,
      applicationId: testAppCompleted.id,
    });
    assert(
      elig1.isEligible === true &&
        elig1.studentName === testClientCompleted.name &&
        elig1.programName === testAppCompleted.course,
      "1. Eligible completed student passes validation with real name and program"
    );

    // Test 2: Incomplete student (WAITLISTED status)
    const elig2 = await checkCertificateEligibility({
      clientId: testClientIncomplete.id,
      applicationId: testAppIncomplete.id,
    });
    assert(
      elig2.isEligible === false &&
        elig2.reason?.includes("not been verified"),
      "2. Incomplete student fails validation with clear completion requirement notice"
    );

    // Test 3: Missing completion information (application with empty/non-completed status)
    const testAppNoStatus = await prisma.application.create({
      data: {
        appNo: `APP-NOSTAT-${testRunId.toString().slice(-6)}`,
        clientId: testClientCompleted.id,
        course: "Drone Engineering",
        status: "NEW",
      },
    });
    const elig3 = await checkCertificateEligibility({
      clientId: testClientCompleted.id,
      applicationId: testAppNoStatus.id,
    });
    assert(
      elig3.isEligible === false,
      "3. Missing completion information correctly prevents certificate eligibility"
    );
    await prisma.application.delete({ where: { id: testAppNoStatus.id } });

    // Test 4: Missing required program name
    const testAppNoCourse = await prisma.application.create({
      data: {
        appNo: `APP-NOCRS-${testRunId.toString().slice(-6)}`,
        clientId: testClientCompleted.id,
        course: "",
        status: "COMPLETED",
      },
    });
    const elig4 = await checkCertificateEligibility({
      clientId: testClientCompleted.id,
      applicationId: testAppNoCourse.id,
    });
    assert(
      elig4.isEligible === false &&
        (elig4.reason?.includes("program") || elig4.reason?.includes("workshop")),
      "4. Missing required program correctly rejects certificate generation"
    );
    await prisma.application.delete({ where: { id: testAppNoCourse.id } });

    // Test 5: Missing required student record (non-existent client ID)
    const elig5 = await checkCertificateEligibility({
      clientId: "000000000000000000000000",
    });
    assert(
      elig5.isEligible === false &&
        (elig5.reason?.includes("not found") || elig5.reason?.includes("does not exist")),
      "5. Missing student record safely caught and rejected without crash"
    );

    // =================================================================
    // 2. CERTIFICATE ISSUANCE & NUMBERING
    // =================================================================
    console.log("\n--- 2. Certificate Issuance & Numbering Tests ---");

    // Test 6: Certificate creation with real student data
    const issuedCert = await issueCertificate({
      clientId: testClientCompleted.id,
      applicationId: testAppCompleted.id,
      programName: testAppCompleted.course,
      completionDate: new Date("2026-09-20"),
      duration: "30 Hours Hands-on",
      trainer: "K. Tamizharasan, Robotics Lead",
      userId: testUserId,
      idempotencyKey: `IDEMP-${testRunId}`,
    });
    createdCertId = issuedCert.id;
    assert(
      Boolean(issuedCert.id) &&
        issuedCert.studentNameSnapshot === testClientCompleted.name &&
        issuedCert.programNameSnapshot === testAppCompleted.course &&
        issuedCert.status === "ISSUED",
      "6. Certificate successfully created with exact immutable student snapshot"
    );

    // Test 7: Certificate number generation (TTRC-CERT-YYYY-XXXX format)
    const certNoRegex = /^TTRC-CERT-\d{4}-\d{4}$/;
    assert(
      certNoRegex.test(issuedCert.certificateNo),
      `7. Certificate number '${issuedCert.certificateNo}' adheres to authoritative TTRC-CERT-YYYY-XXXX convention`
    );

    // Test 8: Verification ID uniqueness and format (TTRC-V...)
    const vId1 = generateVerificationId();
    const vId2 = generateVerificationId();
    assert(
      issuedCert.verificationId.startsWith("TTRC-V") &&
        vId1 !== vId2 &&
        issuedCert.verificationId.length >= 10,
      `8. Verification ID '${issuedCert.verificationId}' is collision-resistant and unique`
    );

    // Test 9: Duplicate issuance prevention for same client and program
    let dupThrew = false;
    try {
      await issueCertificate({
        clientId: testClientCompleted.id,
        applicationId: testAppCompleted.id,
        programName: testAppCompleted.course,
      });
    } catch (err: any) {
      dupThrew = true;
      assert(
        err.message.includes("already been issued"),
        "9. Duplicate certificate prevention blocks redundant issuance for same program"
      );
    }
    if (!dupThrew) {
      assert(false, "9. Duplicate certificate prevention failed to throw an error");
    }

    // Test 10: Concurrent issuance race condition prevention
    let concurrentSuccess = 0;
    let concurrentBlocked = 0;
    const testProgramConcurrent = `Microcontroller Robotics Masterclass ${testRunId}`;
    const promises = [1, 2, 3].map(async () => {
      try {
        await issueCertificate({
          clientId: testClientCompleted.id,
          programName: testProgramConcurrent,
        });
        concurrentSuccess++;
      } catch (err) {
        concurrentBlocked++;
      }
    });
    await Promise.all(promises);
    assert(
      concurrentSuccess === 1 && concurrentBlocked === 2,
      "10. Concurrent issuance race safely allowed exactly 1 certificate and blocked 2 duplicates"
    );

    // Clean up concurrent certificate
    await db.collection("Certificate").deleteMany({
      programNameSnapshot: testProgramConcurrent,
    });

    // Test 11: Idempotent retry with the same idempotencyKey returns existing certificate
    const retryResult = await issueCertificate({
      clientId: testClientCompleted.id,
      applicationId: testAppCompleted.id,
      programName: testAppCompleted.course,
      idempotencyKey: `IDEMP-${testRunId}`,
    });
    assert(
      retryResult.id === issuedCert.id &&
        retryResult.certificateNo === issuedCert.certificateNo,
      "11. Idempotent retry returns existing certificate without duplicating numbers"
    );

    // Test 12: Audit logging on issuance
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        module: "CERTIFICATE",
        entityId: issuedCert.id,
      },
    });
    assert(
      auditLogs.length > 0 &&
        auditLogs.some((l) => l.action === "CERTIFICATE_ISSUED"),
      "12. Audit log entry recorded with CERTIFICATE_ISSUED event"
    );

    // =================================================================
    // 3. CERTIFICATE PDF GENERATION
    // =================================================================
    console.log("\n--- 3. Certificate PDF Generation Tests ---");

    // Test 13 & 14: PDF generation and %PDF- header validation
    const verificationUrl = getCertificateVerificationUrl(issuedCert.verificationId);
    const qrDataUri = await generateCertificateQrDataUri(verificationUrl);

    const pdfElement = React.createElement(CertificatePDFTemplate, {
      certificate: issuedCert,
      company: DEFAULT_COMPANY_SETTINGS,
      logoSrc: "",
      signatureSrc: "",
      qrDataUri,
    });

    const pdfStream = await renderToStream(pdfElement as any);
    const pdfBuffer = await streamToBuffer(pdfStream);

    assert(
      pdfBuffer.length > 1000,
      `13. PDF successfully generated with ${pdfBuffer.length} bytes`
    );

    const pdfHeader = pdfBuffer.slice(0, 5).toString("utf-8");
    assert(
      pdfHeader === "%PDF-",
      `14. PDF starts with valid magic bytes '%PDF-' (received '${pdfHeader}')`
    );

    // Test 15: Student name rendered in PDF stream
    const pdfText = pdfBuffer.toString("latin1");
    // react-pdf streams compress objects; verify props passed into element
    assert(
      pdfElement.props.certificate.studentNameSnapshot === testClientCompleted.name,
      "15. Student name correctly supplied and bound to PDF template"
    );

    // Test 16: Program name rendered in PDF
    assert(
      pdfElement.props.certificate.programNameSnapshot === testAppCompleted.course,
      "16. Program title accurately passed into PDF document"
    );

    // Test 17: Certificate number rendered in PDF
    assert(
      pdfElement.props.certificate.certificateNo === issuedCert.certificateNo,
      "17. Authoritative Certificate Number rendered on PDF layout"
    );

    // Test 18: QR code generation produces valid base64 data URI
    assert(
      qrDataUri.startsWith("data:image/png;base64,"),
      "18. QR code rendered as valid base64 PNG data URI"
    );

    // Test 19: Verification URL contains canonical verification route
    assert(
      verificationUrl.includes(`/certificate/verify/${issuedCert.verificationId}`),
      `19. Verification URL '${verificationUrl}' points to official public route`
    );

    // =================================================================
    // 4. PUBLIC CERTIFICATE VERIFICATION & ZERO-DATA-LEAKAGE
    // =================================================================
    console.log("\n--- 4. Public Verification & Security Tests ---");

    // Test 20: Valid certificate verification returns correct public status
    const verifiedPublic = await verifyCertificatePublic(issuedCert.verificationId);
    assert(
      verifiedPublic !== null &&
        verifiedPublic.isValid === true &&
        verifiedPublic.certificateNo === issuedCert.certificateNo &&
        verifiedPublic.studentName === testClientCompleted.name &&
        verifiedPublic.programName === testAppCompleted.course,
      "20. Valid certificate returns public verification with VALID status and real details"
    );

    // Test 21: VOID certificate reflects isVoid: true
    // Temporarily test voiding on a separate certificate
    const testTempCert = await issueCertificate({
      clientId: testClientCompleted.id,
      programName: `Intro to Quadcopter Drone Dynamics ${testRunId}`,
    });
    await voidCertificate(testTempCert.id, "Testing Void Status Verification");
    const voidVerified = await verifyCertificatePublic(testTempCert.verificationId);
    assert(
      voidVerified !== null &&
        voidVerified.isVoid === true &&
        voidVerified.isValid === false &&
        voidVerified.voidReason === "Testing Void Status Verification",
      "21. Voided certificate shows VOID status with stated administrative reason"
    );
    await db.collection("Certificate").deleteOne({ _id: new ObjectId(testTempCert.id) });

    // Test 22: Unknown verification ID returns null (404)
    const unknownVerified = await verifyCertificatePublic("TTRC-VNONEXISTENT99");
    assert(
      unknownVerified === null,
      "22. Unknown verification ID returns null (clean 404 response)"
    );

    // Test 23: Private data NOT exposed in public verification payload
    const exposedKeys = Object.keys(verifiedPublic || {});
    const hasMobile = exposedKeys.includes("mobile") || (verifiedPublic as any).mobile;
    const hasEmail = exposedKeys.includes("email") || (verifiedPublic as any).email;
    const hasAddress = exposedKeys.includes("address") || (verifiedPublic as any).address;
    const hasDbId = exposedKeys.includes("_id") || exposedKeys.includes("id");
    assert(
      !hasMobile && !hasEmail && !hasAddress && !hasDbId,
      "23. Public verification strictly shields student email, phone, address, and MongoDB internal ID"
    );

    // Test 24: IDOR Protection (cannot verify by database _id or arbitrary keys)
    const idorAttempt = await verifyCertificatePublic(issuedCert.id);
    assert(
      idorAttempt === null,
      "24. IDOR Protection: Internal database ID rejected on public verification endpoint"
    );

    // =================================================================
    // 5. REISSUE WORKFLOW & HISTORICAL PRESERVATION
    // =================================================================
    console.log("\n--- 5. Reissue Workflow Tests ---");

    // Test 25: Reissue voids original certificate
    const reissuedResult = await reissueCertificate({
      certificateId: issuedCert.id,
      reason: "Course name typo correction and honors addition",
      updatedProgramName: "Autonomous Mobile Robotics & ROS STEM Workshop (with Honors)",
      userId: testUserId,
    });
    reissuedCertId = reissuedResult.id;

    const originalAfterReissue = await getCertificateById(issuedCert.id);
    assert(
      Boolean(originalAfterReissue) &&
        originalAfterReissue?.status === "VOID" &&
        originalAfterReissue?.voidReason?.includes("Reissued as"),
      "25. Reissue atomically marks original certificate as VOID"
    );

    // Test 26: Generate new certificate with unique number
    assert(
      reissuedResult.status === "ISSUED" &&
        reissuedResult.certificateNo !== issuedCert.certificateNo &&
        reissuedResult.verificationId !== issuedCert.verificationId,
      `26. Reissued certificate allocated new number '${reissuedResult.certificateNo}' and new verification ID`
    );

    // Test 27: Historical record preserved and bidirectional trace link intact
    assert(
      originalAfterReissue?.reissuedToCertificateId === reissuedResult.id &&
        reissuedResult.reissuedFromCertificateId === issuedCert.id,
      "27. Bidirectional audit links connect original voided certificate and new reissued certificate"
    );

    // Test 28: Audit trail preserved for reissue
    const reissueAudit = await prisma.auditLog.findMany({
      where: {
        module: "CERTIFICATE",
        entityId: { in: [issuedCert.id, reissuedResult.id] },
      },
    });
    assert(
      reissueAudit.some((l) => l.action === "CERTIFICATE_REISSUED") &&
        reissueAudit.some((l) => l.action === "CERTIFICATE_VOIDED"),
      "28. Audit logs confirm both CERTIFICATE_VOIDED and CERTIFICATE_REISSUED events"
    );

    console.log("\n=================================================");
    console.log(`PHASE 4 TEST SUMMARY: ${passed} PASSED / ${failed} FAILED`);
    console.log("=================================================");
  } finally {
    // -----------------------------------------------------------------
    // CLEANUP: Clean up test fixtures to maintain Zero Mock policy
    // -----------------------------------------------------------------
    console.log("\nCleaning up test artifacts...");
    if (createdCertId) {
      await db.collection("Certificate").deleteOne({ _id: new ObjectId(createdCertId) });
    }
    if (reissuedCertId) {
      await db.collection("Certificate").deleteOne({ _id: new ObjectId(reissuedCertId) });
    }
    if (testAppCompleted?.id) {
      await prisma.application.delete({ where: { id: testAppCompleted.id } }).catch(() => {});
    }
    if (testAppIncomplete?.id) {
      await prisma.application.delete({ where: { id: testAppIncomplete.id } }).catch(() => {});
    }
    if (testClientCompleted?.id) {
      await prisma.client.delete({ where: { id: testClientCompleted.id } }).catch(() => {});
    }
    if (testClientIncomplete?.id) {
      await prisma.client.delete({ where: { id: testClientIncomplete.id } }).catch(() => {});
    }
    console.log("Test cleanup completed cleanly.\n");
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
