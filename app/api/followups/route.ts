import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow } from '@/lib/sheets';
import { followUpSchema } from '@/lib/validations';
import { generateId } from '@/lib/utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');

  try {
    let followups = await getSheetData('FollowUps');
    if (clientId) {
      followups = followups.filter((f: any) => f.clientId === clientId);
    }
    return NextResponse.json({ success: true, data: followups });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const validatedData = followUpSchema.parse(body);
    
    const newFollowUp = {
      id: generateId(),
      ...validatedData,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };

    await appendRow('FollowUps', newFollowUp);
    return NextResponse.json({ success: true, data: newFollowUp });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
