import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow } from '@/lib/sheets';
import { applicationSchema } from '@/lib/validations';
import { generateId } from '@/lib/utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const applications = await getSheetData('Applications');
    return NextResponse.json({ success: true, data: applications });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const validatedData = applicationSchema.parse(body);
    
    const newApplication = {
      id: generateId(),
      ...validatedData,
      status: 'Applied',
      createdAt: new Date().toISOString(),
    };

    await appendRow('Applications', newApplication);
    return NextResponse.json({ success: true, data: newApplication });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
