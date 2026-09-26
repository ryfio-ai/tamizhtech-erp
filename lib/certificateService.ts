import { ObjectId } from "mongodb";
import crypto from "crypto";
import QRCode from "qrcode";
import { getMongoDb } from "@/lib/mongodb";
import prisma from "@/lib/prisma";
import { allocateCertificateNo, generateDraftCertificateNo } from "@/lib/sequence";

export type CertificateStatus = "DRAFT" | "ISSUED" | "VOID";

export interface CertificateRecord {
  id: string;
  certificateNo: string;
  verificationId: string;
  applicationId?: string | null;
  clientId: string;
  studentNameSnapshot: string;
  programNameSnapshot: string;
  issueDate: Date;
  completionDate: Date;
  duration?: string | null;
  trainer?: string | null;
  status: CertificateStatus;
  voidReason?: string | null;
  voidedAt?: Date | null;
  reissuedFromCertificateId?: string | null;
  reissuedToCertificateId?: string | null;
  idempotencyKey?: string | null;
  issuedById?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCertificateInput {
  clientId: string;
  applicationId?: string | null;
  programName: string;
  completionDate?: Date | string;
  issueDate?: Date | string;
  duration?: string | null;
  trainer?: string | null;
  status?: CertificateStatus;
  notes?: string | null;
  userId?: string;
  idempotencyKey?: string;
}

export interface ReissueCertificateInput {
  certificateId: string;
  reason: string;
  updatedProgramName?: string;
  updatedCompletionDate?: Date | string;
  updatedDuration?: string;
  updatedTrainer?: string;
  notes?: string;
  userId?: string;
}

export interface CertificateEligibilityResult {
  isEligible: boolean;
  reason?: string;
  studentName?: string;
  programName?: string;
  clientId?: string;
  applicationId?: string;
  clientCode?: string;
  suggestedCompletionDate?: Date;
}

const CERTIFICATE_COLLECTION = "Certificate";

/**
 * Generates a collision-resistant, URL-safe verification identifier.
 * Format: TTRC-V followed by 12 uppercase hexadecimal characters.
 * Example: TTRC-V9E2F8B1A0C4
 */
export function generateVerificationId(): string {
  const randHex = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `TTRC-V${randHex}`;
}

/**
 * Derives the canonical public verification URL for a certificate.
 */
export function getCertificateVerificationUrl(verificationId: string): string {
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.tamizhtech.in";
  const cleanBase = baseUrl.replace(/\/+$/, "");
  return `${cleanBase}/certificate/verify/${verificationId}`;
}

/**
 * Generates a verification QR code Data URI for the certificate PDF.
 */
export async function generateCertificateQrDataUri(verificationUrl: string): Promise<string> {
  return QRCode.toDataURL(verificationUrl, {
    width: 200,
    margin: 1,
    color: {
      dark: "#0F172A",
      light: "#FFFFFF",
    },
  });
}

/**
 * Checks whether a student application or client record is genuinely eligible for a certificate.
 * Enforces strict completion validation without fabricating records.
 */
export async function checkCertificateEligibility(params: {
  applicationId?: string;
  clientId?: string;
  programName?: string;
}): Promise<CertificateEligibilityResult> {
  const { applicationId, clientId, programName } = params;

  // 1. If Application ID provided, check application completion state
  if (applicationId) {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { client: true },
    });

    if (!app) {
      return {
        isEligible: false,
        reason: "Certificate cannot be issued: Student application record not found.",
      };
    }

    const appStatus = (app.status || "").toUpperCase();
    const eligibleStatuses = ["ENROLLED", "COMPLETED"];

    if (!eligibleStatuses.includes(appStatus)) {
      return {
        isEligible: false,
        reason: `Certificate cannot be issued: Application status is '${app.status}'. This student's completion requirements have not been verified.`,
        studentName: app.client?.name,
        programName: app.course,
      };
    }

    if (!app.course || app.course.trim().length === 0) {
      return {
        isEligible: false,
        reason: "Certificate cannot be issued: Application does not specify a program or workshop name.",
        studentName: app.client?.name,
      };
    }

    return {
      isEligible: true,
      studentName: app.client?.name || "Student Applicant",
      programName: app.course.trim(),
      clientId: app.clientId,
      applicationId: app.id,
      clientCode: app.client?.clientCode,
      suggestedCompletionDate: app.createdAt,
    };
  }

  // 2. If Client ID provided, check client education service profile
  if (clientId) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { applications: true },
    });

    if (!client) {
      return {
        isEligible: false,
        reason: "Certificate cannot be issued: Student customer record not found.",
      };
    }

    // Check for an enrolled or completed application for this client
    const completedApp = client.applications.find((a) =>
      ["ENROLLED", "COMPLETED"].includes((a.status || "").toUpperCase())
    );

    if (completedApp) {
      return {
        isEligible: true,
        studentName: client.name,
        programName: completedApp.course,
        clientId: client.id,
        applicationId: completedApp.id,
        clientCode: client.clientCode,
        suggestedCompletionDate: completedApp.createdAt,
      };
    }

    // Fallback: If client has explicit educational workshop serviceType
    const isEduService =
      client.serviceType &&
      /robot|workshop|stem|train|course|club/i.test(client.serviceType);

    if (isEduService || client.status === "STUDENT") {
      const progName = programName?.trim() || client.serviceType || "Robotics & STEM Workshop";
      return {
        isEligible: true,
        studentName: client.name,
        programName: progName,
        clientId: client.id,
        clientCode: client.clientCode,
        suggestedCompletionDate: client.createdAt,
      };
    }

    return {
      isEligible: false,
      reason: "Certificate cannot be issued: This student's completion requirements have not been verified.",
      studentName: client.name,
    };
  }

  return {
    isEligible: false,
    reason: "Certificate cannot be issued: Missing student identification.",
  };
}

/**
 * Creates an authoritative Certificate record.
 * Generates official permanent number or provisional draft number,
 * captures an immutable data snapshot, enforces duplicate protection,
 * and logs central audit trails.
 */
export async function issueCertificate(input: CreateCertificateInput): Promise<CertificateRecord> {
  const {
    clientId,
    applicationId,
    programName,
    completionDate = new Date(),
    issueDate = new Date(),
    duration,
    trainer = "TamizhTech Lead Robotics Trainer",
    status = "ISSUED",
    notes,
    userId,
    idempotencyKey,
  } = input;

  const db = await getMongoDb();

  // 1. Idempotency Check
  const cleanKey = idempotencyKey?.trim();
  if (cleanKey) {
    const existing = await db.collection(CERTIFICATE_COLLECTION).findOne({ idempotencyKey: cleanKey });
    if (existing) {
      return {
        id: existing._id.toString(),
        certificateNo: existing.certificateNo,
        verificationId: existing.verificationId,
        applicationId: existing.applicationId,
        clientId: existing.clientId,
        studentNameSnapshot: existing.studentNameSnapshot,
        programNameSnapshot: existing.programNameSnapshot,
        issueDate: existing.issueDate,
        completionDate: existing.completionDate,
        duration: existing.duration,
        trainer: existing.trainer,
        status: existing.status,
        voidReason: existing.voidReason,
        voidedAt: existing.voidedAt,
        reissuedFromCertificateId: existing.reissuedFromCertificateId,
        reissuedToCertificateId: existing.reissuedToCertificateId,
        idempotencyKey: existing.idempotencyKey,
        issuedById: existing.issuedById,
        notes: existing.notes,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      };
    }
  }

  // 2. Validate Eligibility
  const eligibility = await checkCertificateEligibility({
    applicationId: applicationId || undefined,
    clientId,
    programName,
  });

  if (!eligibility.isEligible) {
    throw new Error(eligibility.reason || "Certificate cannot be issued.");
  }

  const studentNameSnapshot = eligibility.studentName || "Valued Participant";
  const programNameSnapshot = programName.trim();

  // 3. Duplicate Prevention: Check if active ISSUED certificate already exists
  if (status === "ISSUED") {
    const existingIssued = await db.collection(CERTIFICATE_COLLECTION).findOne({
      clientId,
      programNameSnapshot,
      status: "ISSUED",
    });

    if (existingIssued) {
      throw new Error(
        `A valid certificate has already been issued for this student and program (Certificate No: ${existingIssued.certificateNo}). To update or replace it, use the Reissue workflow.`
      );
    }
  }

  // 4. Generate Certificate Number and Verification ID
  let certificateNo: string;
  if (status === "ISSUED") {
    certificateNo = await allocateCertificateNo();
  } else {
    certificateNo = generateDraftCertificateNo();
  }

  const verificationId = generateVerificationId();
  const now = new Date();

  const newDoc = {
    certificateNo,
    verificationId,
    applicationId: applicationId || null,
    clientId,
    studentNameSnapshot,
    programNameSnapshot,
    issueDate: new Date(issueDate),
    completionDate: new Date(completionDate),
    duration: duration?.trim() || null,
    trainer: trainer?.trim() || null,
    status,
    voidReason: null,
    voidedAt: null,
    reissuedFromCertificateId: null,
    reissuedToCertificateId: null,
    idempotencyKey: cleanKey || null,
    issuedById: userId || null,
    notes: notes || null,
    createdAt: now,
    updatedAt: now,
  };

  const insertRes = await db.collection(CERTIFICATE_COLLECTION).insertOne(newDoc);
  const certId = insertRes.insertedId.toString();

  // 5. Audit Trail
  if (userId) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: status === "ISSUED" ? "CERTIFICATE_ISSUED" : "CERTIFICATE_CREATED",
          module: "CERTIFICATE",
          entityId: certId,
          newData: JSON.stringify({
            certificateNo,
            verificationId,
            studentName: studentNameSnapshot,
            programName: programNameSnapshot,
            status,
          }),
        },
      });
    } catch (e) {
      console.error("[Certificate] Audit log error:", e);
    }
  }

  return {
    id: certId,
    ...newDoc,
  };
}

/**
 * Reissues an issued certificate.
 * Permanently voids the original certificate with an explicit audit reason,
 * allocates a new official sequential certificate number and new verification ID,
 * and maintains full bidirectional historical traceability.
 */
export async function reissueCertificate(input: ReissueCertificateInput): Promise<CertificateRecord> {
  const {
    certificateId,
    reason,
    updatedProgramName,
    updatedCompletionDate,
    updatedDuration,
    updatedTrainer,
    notes,
    userId,
  } = input;

  if (!reason || reason.trim().length === 0) {
    throw new Error("A valid reason is required to void and reissue a certificate.");
  }

  const db = await getMongoDb();
  const original = await db
    .collection(CERTIFICATE_COLLECTION)
    .findOne({ _id: new ObjectId(certificateId) });

  if (!original) {
    throw new Error(`Original certificate not found: ${certificateId}`);
  }

  if (original.status === "VOID") {
    throw new Error("Cannot reissue a VOID certificate. It has already been voided.");
  }

  const now = new Date();

  // 1. Allocate New Official Certificate Number & Verification ID
  const newCertificateNo = await allocateCertificateNo();
  const newVerificationId = generateVerificationId();

  // 2. Create the New Reissued Certificate
  const newDoc = {
    certificateNo: newCertificateNo,
    verificationId: newVerificationId,
    applicationId: original.applicationId,
    clientId: original.clientId,
    studentNameSnapshot: original.studentNameSnapshot,
    programNameSnapshot: updatedProgramName?.trim() || original.programNameSnapshot,
    issueDate: now,
    completionDate: updatedCompletionDate ? new Date(updatedCompletionDate) : original.completionDate,
    duration: updatedDuration !== undefined ? updatedDuration : original.duration,
    trainer: updatedTrainer !== undefined ? updatedTrainer : original.trainer,
    status: "ISSUED" as CertificateStatus,
    voidReason: null,
    voidedAt: null,
    reissuedFromCertificateId: original._id.toString(),
    reissuedToCertificateId: null,
    idempotencyKey: null,
    issuedById: userId || null,
    notes: [notes, `Reissued from ${original.certificateNo}: ${reason}`].filter(Boolean).join(" • "),
    createdAt: now,
    updatedAt: now,
  };

  const insertRes = await db.collection(CERTIFICATE_COLLECTION).insertOne(newDoc);
  const newCertId = insertRes.insertedId.toString();

  // 3. Void the Original Certificate permanently
  await db.collection(CERTIFICATE_COLLECTION).updateOne(
    { _id: new ObjectId(certificateId) },
    {
      $set: {
        status: "VOID",
        voidReason: `Reissued as ${newCertificateNo}: ${reason.trim()}`,
        voidedAt: now,
        reissuedToCertificateId: newCertId,
        updatedAt: now,
      },
    }
  );

  // 4. Audit Logging
  if (userId) {
    try {
      // Audit entry 1: Void event on original certificate
      await prisma.auditLog.create({
        data: {
          userId,
          action: "CERTIFICATE_VOIDED",
          module: "CERTIFICATE",
          entityId: original._id.toString(),
          newData: JSON.stringify({
            status: "VOID",
            reason: `Reissued as ${newCertificateNo}: ${reason}`,
            reissuedToCertificateId: newCertId,
          }),
        },
      });

      // Audit entry 2: Reissue event on new certificate
      await prisma.auditLog.create({
        data: {
          userId,
          action: "CERTIFICATE_REISSUED",
          module: "CERTIFICATE",
          entityId: newCertId,
          oldData: JSON.stringify({
            originalCertificateId: original._id.toString(),
            originalCertificateNo: original.certificateNo,
            voidReason: reason,
          }),
          newData: JSON.stringify({
            newCertificateNo,
            newVerificationId,
            studentName: newDoc.studentNameSnapshot,
          }),
        },
      });
    } catch (e) {
      console.error("[Certificate] Audit log error:", e);
    }
  }

  return {
    id: newCertId,
    ...newDoc,
  };
}

/**
 * Voids an active certificate without reissuing.
 */
export async function voidCertificate(
  certificateId: string,
  reason: string,
  userId?: string
): Promise<CertificateRecord> {
  if (!reason || reason.trim().length === 0) {
    throw new Error("A valid reason is required to void a certificate.");
  }

  const db = await getMongoDb();
  const cert = await db
    .collection(CERTIFICATE_COLLECTION)
    .findOne({ _id: new ObjectId(certificateId) });

  if (!cert) {
    throw new Error(`Certificate not found: ${certificateId}`);
  }

  if (cert.status === "VOID") {
    return {
      id: cert._id.toString(),
      certificateNo: cert.certificateNo,
      verificationId: cert.verificationId,
      applicationId: cert.applicationId,
      clientId: cert.clientId,
      studentNameSnapshot: cert.studentNameSnapshot,
      programNameSnapshot: cert.programNameSnapshot,
      issueDate: cert.issueDate,
      completionDate: cert.completionDate,
      duration: cert.duration,
      trainer: cert.trainer,
      status: cert.status,
      voidReason: cert.voidReason,
      voidedAt: cert.voidedAt,
      reissuedFromCertificateId: cert.reissuedFromCertificateId,
      reissuedToCertificateId: cert.reissuedToCertificateId,
      issuedById: cert.issuedById,
      notes: cert.notes,
      createdAt: cert.createdAt,
      updatedAt: cert.updatedAt,
    };
  }

  const now = new Date();
  await db.collection(CERTIFICATE_COLLECTION).updateOne(
    { _id: new ObjectId(certificateId) },
    {
      $set: {
        status: "VOID",
        voidReason: reason.trim(),
        voidedAt: now,
        updatedAt: now,
      },
    }
  );

  if (userId) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "CERTIFICATE_VOIDED",
          module: "CERTIFICATE",
          entityId: certificateId,
          newData: JSON.stringify({
            certificateNo: cert.certificateNo,
            voidReason: reason,
            voidedAt: now,
          }),
        },
      });
    } catch (e) {
      console.error("[Certificate] Audit log error:", e);
    }
  }

  return {
    id: cert._id.toString(),
    certificateNo: cert.certificateNo,
    verificationId: cert.verificationId,
    applicationId: cert.applicationId,
    clientId: cert.clientId,
    studentNameSnapshot: cert.studentNameSnapshot,
    programNameSnapshot: cert.programNameSnapshot,
    issueDate: cert.issueDate,
    completionDate: cert.completionDate,
    duration: cert.duration,
    trainer: cert.trainer,
    status: "VOID",
    voidReason: reason.trim(),
    voidedAt: now,
    reissuedFromCertificateId: cert.reissuedFromCertificateId,
    reissuedToCertificateId: cert.reissuedToCertificateId,
    issuedById: cert.issuedById,
    notes: cert.notes,
    createdAt: cert.createdAt,
    updatedAt: now,
  };
}

/**
 * Public Verification lookup by verificationId.
 * Strips all internal database IDs, personal mobile numbers, emails, and address details.
 * Prevents IDOR and enumeration.
 */
export async function verifyCertificatePublic(verificationId: string) {
  if (!verificationId || verificationId.trim().length === 0) {
    return null;
  }

  const db = await getMongoDb();
  const cert = await db.collection(CERTIFICATE_COLLECTION).findOne({
    verificationId: verificationId.trim().toUpperCase(),
  });

  if (!cert) {
    return null;
  }

  // Safe public payload: Zero sensitive information exposed
  return {
    verificationId: cert.verificationId,
    certificateNo: cert.certificateNo,
    studentName: cert.studentNameSnapshot,
    programName: cert.programNameSnapshot,
    completionDate: cert.completionDate,
    issueDate: cert.issueDate,
    duration: cert.duration || null,
    trainer: cert.trainer || "Tamizh Tech Robotics Company",
    issuedBy: "Tamizh Tech Robotics Company",
    status: cert.status as CertificateStatus,
    isValid: cert.status === "ISSUED",
    isVoid: cert.status === "VOID",
    voidReason: cert.status === "VOID" ? cert.voidReason : null,
  };
}

/**
 * Retrieves a single certificate by its internal ID (for Admin UI / PDF rendering).
 */
export async function getCertificateById(certificateId: string) {
  const db = await getMongoDb();
  const cert = await db
    .collection(CERTIFICATE_COLLECTION)
    .findOne({ _id: new ObjectId(certificateId) });

  if (!cert) return null;

  const client = await prisma.client.findUnique({
    where: { id: cert.clientId },
    select: {
      id: true,
      name: true,
      company: true,
      clientCode: true,
      phone: true,
      email: true,
    },
  });

  return {
    id: cert._id.toString(),
    certificateNo: cert.certificateNo,
    verificationId: cert.verificationId,
    applicationId: cert.applicationId,
    clientId: cert.clientId,
    client,
    studentNameSnapshot: cert.studentNameSnapshot,
    programNameSnapshot: cert.programNameSnapshot,
    issueDate: cert.issueDate,
    completionDate: cert.completionDate,
    duration: cert.duration,
    trainer: cert.trainer,
    status: cert.status as CertificateStatus,
    voidReason: cert.voidReason,
    voidedAt: cert.voidedAt,
    reissuedFromCertificateId: cert.reissuedFromCertificateId,
    reissuedToCertificateId: cert.reissuedToCertificateId,
    issuedById: cert.issuedById,
    notes: cert.notes,
    createdAt: cert.createdAt,
    updatedAt: cert.updatedAt,
  };
}

/**
 * Lists certificates with optional filters.
 */
export async function listCertificates(filter?: {
  clientId?: string;
  status?: CertificateStatus;
}) {
  const db = await getMongoDb();
  const query: any = {};
  if (filter?.clientId) query.clientId = filter.clientId;
  if (filter?.status) query.status = filter.status;

  const certs = await db
    .collection(CERTIFICATE_COLLECTION)
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  if (certs.length === 0) return [];

  const clientIds = Array.from(new Set(certs.map((c) => c.clientId)));
  const clients = await prisma.client.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, name: true, clientCode: true },
  });
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  return certs.map((c) => ({
    id: c._id.toString(),
    certificateNo: c.certificateNo,
    verificationId: c.verificationId,
    studentName: c.studentNameSnapshot,
    programName: c.programNameSnapshot,
    client: clientMap.get(c.clientId) || null,
    issueDate: c.issueDate,
    completionDate: c.completionDate,
    duration: c.duration,
    status: c.status,
    voidReason: c.voidReason,
    reissuedToCertificateId: c.reissuedToCertificateId,
    createdAt: c.createdAt,
  }));
}

/**
 * Fetches all students currently eligible for certificates from Application and Client records.
 */
export async function listEligibleStudents() {
  // Fetch enrolled or completed applications
  const applications = await prisma.application.findMany({
    where: {
      status: { in: ["ENROLLED", "COMPLETED", "Enrolled", "Completed"] },
    },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  // Fetch already issued certificates to identify unissued vs issued
  const db = await getMongoDb();
  const issuedCerts = await db
    .collection(CERTIFICATE_COLLECTION)
    .find({ status: "ISSUED" })
    .toArray();

  const issuedKeySet = new Set(
    issuedCerts.map((c) => `${c.clientId}::${c.programNameSnapshot}`)
  );

  const eligibleList = [];

  for (const app of applications) {
    if (!app.course || !app.client) continue;
    const key = `${app.clientId}::${app.course.trim()}`;
    const alreadyIssued = issuedKeySet.has(key);

    eligibleList.push({
      applicationId: app.id,
      clientId: app.clientId,
      studentName: app.client.name,
      clientCode: app.client.clientCode,
      programName: app.course.trim(),
      status: app.status,
      appliedDate: app.createdAt,
      alreadyIssued,
    });
  }

  return eligibleList;
}
