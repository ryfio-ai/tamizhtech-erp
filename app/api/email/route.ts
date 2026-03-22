import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { z } from "zod";

const emailRequestSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(), // base64
    contentType: z.string()
  })).optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, html, attachments } = emailRequestSchema.parse(body);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // Formatting attachments for nodemailer if provided
    const mailAttachments = attachments ? attachments.map(att => ({
      filename: att.filename,
      content: Buffer.from(att.content, 'base64'),
      contentType: att.contentType
    })) : [];

    const mailOptions = {
      from: `"TamizhTech" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
      attachments: mailAttachments
    };

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, messageId: info.messageId });
    
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid email parameters" }, { status: 400 });
    }
    console.error("Email sending failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
