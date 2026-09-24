import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getPrivateAttachmentFile } from "@/lib/storage/submissionStorage";

export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; key: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id, key } = params;

    // Verify submission exists and key belongs to this submission
    const submission = await prisma.inboundSubmission.findUnique({
      where: { id },
      select: { id: true, attachmentMetadata: true },
    });

    if (!submission) {
      return NextResponse.json({ success: false, error: "Submission not found" }, { status: 404 });
    }

    const meta = submission.attachmentMetadata as any;
    if (!meta || meta.storageKey !== key) {
      return NextResponse.json(
        { success: false, error: "Attachment not associated with this submission" },
        { status: 403 }
      );
    }

    const file = await getPrivateAttachmentFile(key);
    if (!file) {
      return NextResponse.json({ success: false, error: "File not found on storage" }, { status: 404 });
    }

    const originalName = meta.fileName || "attachment.pdf";

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(originalName)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("[ATTACHMENT_DOWNLOAD_ERROR]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve attachment" },
      { status: 500 }
    );
  }
}
