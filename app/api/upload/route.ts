import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SUPPORTED_PREFIXES = ['video/', 'image/', 'audio/'];

function safeFileName(name: string) {
  const clean = name.replace(/[^a-z0-9._-]/gi, '-').replace(/-+/g, '-');
  return clean || 'media';
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No media file was uploaded.' }, { status: 400 });
    }
    if (!SUPPORTED_PREFIXES.some((prefix) => file.type.startsWith(prefix))) {
      return NextResponse.json({ error: 'Unsupported file type. Upload a video, image, or audio file.' }, { status: 415 });
    }

    const type = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'audio';
    const id = crypto.randomUUID();
    const originalFileName = file.name || `${type}-upload`;
    const extension = path.extname(originalFileName);
    const filename = `${id}-${safeFileName(path.basename(originalFileName, extension))}${extension}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), bytes);

    return NextResponse.json({
      id,
      url: `/api/uploads/${encodeURIComponent(filename)}`,
      type,
      originalFileName,
      width: null,
      height: null,
      duration: null,
      status: 'deployed',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
