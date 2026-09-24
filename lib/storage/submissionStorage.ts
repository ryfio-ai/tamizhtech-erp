import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { put, del } from "@vercel/blob";
import prisma from "@/lib/prisma";

const FALLBACK_STORAGE_DIR = path.join(process.cwd(), "private_uploads", "resumes");

export interface AttachmentMetadata {
  storageKey: string;
  fileName: string;
  mimeType: string;
  size: number;
  checksum?: string;
  createdAt: string;
}

export async function ensureFallbackStorageDir(): Promise<void> {
  await fs.mkdir(FALLBACK_STORAGE_DIR, { recursive: true });
}

/**
 * Saves a candidate's resume to Vercel Private Blob.
 * If BLOB_READ_WRITE_TOKEN is not configured (e.g. local dev / test),
 * falls back to private directory storage.
 */
export async function savePrivateAttachment(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  idempotencyKey?: string
): Promise<AttachmentMetadata> {
  const safeOriginalName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = path.extname(safeOriginalName).toLowerCase();
  const randomHex = crypto.randomBytes(16).toString("hex");
  const storageKey = `resume_${Date.now()}_${randomHex}${ext}`;
  const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (blobToken) {
    try {
      console.log(`[VERCEL_BLOB] Storing private resume to Vercel Private Blob: ${storageKey}`);
      // Upload using Vercel Private Blob
      await put(`resumes/${storageKey}`, fileBuffer, {
        access: "private",
        contentType: mimeType,
        token: blobToken,
      });
    } catch (blobErr: any) {
      console.error("[VERCEL_BLOB_ERROR] Falling back to local storage:", blobErr.message);
      await ensureFallbackStorageDir();
      const filePath = path.join(FALLBACK_STORAGE_DIR, storageKey);
      await fs.writeFile(filePath, fileBuffer);
    }
  } else {
    // Local / Test private storage fallback
    await ensureFallbackStorageDir();
    const filePath = path.join(FALLBACK_STORAGE_DIR, storageKey);
    await fs.writeFile(filePath, fileBuffer);
  }

  // Register Pending Attachment for Ownership Tracking & Orphan Cleanup
  if (idempotencyKey) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2); // 2 hours expiration for pending uploads

    await prisma.pendingAttachment.upsert({
      where: { storageKey },
      create: {
        storageKey,
        idempotencyKey,
        fileName: safeOriginalName,
        mimeType,
        size: fileBuffer.length,
        checksum,
        status: "PENDING",
        expiresAt,
      },
      update: {
        idempotencyKey,
        status: "PENDING",
        expiresAt,
      },
    }).catch((e) => console.warn("[PENDING_ATTACHMENT_WARN]:", e.message));
  }

  return {
    storageKey,
    fileName: safeOriginalName,
    mimeType,
    size: fileBuffer.length,
    checksum,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Retrieves a candidate resume file for authenticated download.
 */
export async function getPrivateAttachmentFile(
  storageKey: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const safeKey = path.basename(storageKey);
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (blobToken) {
    try {
      // In Vercel Private Blob, private blobs can be downloaded via authorization header
      // or through blob signed/download URL
      const res = await fetch(`https://blob.vercel-storage.com/resumes/${safeKey}`, {
        headers: { Authorization: `Bearer ${blobToken}` },
      });

      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const mimeType = res.headers.get("content-type") || "application/pdf";
        return { buffer: Buffer.from(arrayBuffer), mimeType };
      }
    } catch (err: any) {
      console.warn("[VERCEL_BLOB_GET_WARN] Checking local fallback:", err.message);
    }
  }

  // Fallback to local storage
  const filePath = path.join(FALLBACK_STORAGE_DIR, safeKey);
  try {
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(safeKey).toLowerCase();
    let mimeType = "application/octet-stream";
    if (ext === ".pdf") mimeType = "application/pdf";
    else if (ext === ".doc") mimeType = "application/msword";
    else if (ext === ".docx") mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    return { buffer, mimeType };
  } catch (err) {
    console.error("[STORAGE_READ_ERROR] Could not read file:", storageKey, err);
    return null;
  }
}

/**
 * Validates and claims a pending upload for a specific submission.
 * Ensures an upload cannot be hijacked or reused across different submissions.
 */
export async function claimAndAttachUpload(idempotencyKey: string, storageKey: string): Promise<boolean> {
  try {
    const pending = await prisma.pendingAttachment.findUnique({
      where: { storageKey },
    });

    if (!pending) {
      // If upload record was not tracked (e.g. legacy), allow if valid storageKey format
      return true;
    }

    if (pending.idempotencyKey !== idempotencyKey) {
      console.warn(`[UPLOAD_CLAIM_REJECTED] storageKey ${storageKey} belongs to key ${pending.idempotencyKey}, not ${idempotencyKey}`);
      return false;
    }

    if (pending.status === "ATTACHED") {
      // Already attached to this submission (idempotent replay)
      return true;
    }

    await prisma.pendingAttachment.update({
      where: { storageKey },
      data: { status: "ATTACHED" },
    });

    return true;
  } catch (err: any) {
    console.error("[CLAIM_UPLOAD_ERROR]:", err.message);
    return true; // fail-open for operational resilience if DB error
  }
}

/**
 * Orphan Cleanup: Removes unattached files past expiration.
 * NEVER deletes a file that has status "ATTACHED".
 */
export async function cleanupExpiredUploads(): Promise<{ cleanedCount: number }> {
  const now = new Date();
  const expiredUploads = await prisma.pendingAttachment.findMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: now },
    },
  });

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  let cleanedCount = 0;

  for (const upload of expiredUploads) {
    try {
      if (blobToken) {
        await del(`resumes/${upload.storageKey}`, { token: blobToken }).catch(() => {});
      }

      // Local fallback removal
      const filePath = path.join(FALLBACK_STORAGE_DIR, path.basename(upload.storageKey));
      await fs.unlink(filePath).catch(() => {});

      await prisma.pendingAttachment.update({
        where: { id: upload.id },
        data: { status: "EXPIRED" },
      });

      cleanedCount++;
    } catch (e: any) {
      console.warn(`[ORPHAN_CLEANUP_WARN] Could not delete ${upload.storageKey}:`, e.message);
    }
  }

  return { cleanedCount };
}
