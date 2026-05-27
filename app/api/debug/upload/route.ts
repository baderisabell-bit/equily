import { NextResponse } from 'next/server';
import { uploadProfileImage } from '../../actions';

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = Number(url.searchParams.get('userId') || '1');
    const formData = await req.formData();

    const result = await uploadProfileImage(userId, formData as unknown as FormData);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: String(err?.message || err) }, { status: 500 });
  }
}
