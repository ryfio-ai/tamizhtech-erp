import { NextRequest, NextResponse } from 'next/server';
import { findById, updateRow, deleteRow } from '@/lib/sheets';
import { applicationSchema } from '@/lib/validations';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail } from '@/lib/mail';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const application = await findById('Applications', params.id);
    if (!application) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: application });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const existing = await findById('Applications', params.id);
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const updateData = { ...existing, ...body };
    await updateRow('Applications', params.id, updateData);
    
    // Status Change Logic (e.g., trigger email)
    if (body.status === 'Approved' && existing.status !== 'Approved') {
        try {
            if (existing.email) {
                await sendEmail({
                    to: existing.email,
                    subject: 'Congratulations! Your Admission at TamizhTech is Approved',
                    html: `
                        <div style="font-family: sans-serif; padding: 40px; color: #1A1A2E;">
                            <h1 style="color: #C0392B;">Welcome to TamizhTech!</h1>
                            <p>Dear ${existing.name},</p>
                            <p>We are thrilled to inform you that your application for the <strong>${existing.course}</strong> course has been <strong>Approved</strong>!</p>
                            <p>Our team will contact you shortly with the next steps regarding your batch timing and course materials.</p>
                            <br/>
                            <p>Best Regards,</p>
                            <p><strong>Admissions Team</strong><br/>TamizhTech, Coimbatore</p>
                        </div>
                    `
                });
            }
        } catch (err) {
            console.error('Failed to send admission email', err);
        }
    }

    return NextResponse.json({ success: true, data: updateData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    await deleteRow('Applications', params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
