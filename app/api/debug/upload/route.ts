import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

function sanitizeUploadFileName(name: string) {
  return String(name || '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '') || 'upload.bin';
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ success: false, error: 'Keine Datei im Formular.' }, { status: 400 });

    const safeName = sanitizeUploadFileName(String((file as any).name || ''));
    const now = Date.now();
    const fileName = `profile-${now}-${safeName}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profile');
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, fileName);
    const bytes = await (file as any).arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const finalUrl = `${appUrl}/uploads/profile/${fileName}`;

    return NextResponse.json({ success: true, url: finalUrl });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: String(err?.message || err) }, { status: 500 });
  }
}

