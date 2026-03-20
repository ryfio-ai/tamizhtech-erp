import { NextRequest, NextResponse } from 'next/server';
import { findById, updateRow, deleteRow } from '@/lib/sheets';
import { followUpSchema } from '@/lib/validations';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const followup = await findById('FollowUps', params.id);
    if (!followup) return NextResponse.json({ success: false, error: 'Follow-up not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: followup });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    // Support partial updates for status
    const followup = await findById('FollowUps', params.id);
    if (!followup) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const updateData = { ...followup, ...body };
    await updateRow('FollowUps', params.id, updateData);
    
    return NextResponse.json({ success: true, data: updateData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    await deleteRow('FollowUps', params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
