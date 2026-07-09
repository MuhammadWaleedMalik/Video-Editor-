import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONTENT_TYPES: Record<string, string> = {
  '.aac': 'audio/aac',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.m4a': 'audio/mp4',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
};

function isSafeUploadName(filename: string) {
  return filename === path.basename(filename) && /^[a-z0-9._-]+$/i.test(filename);
}

export async function GET(
  _request: Request,
  { params }: { params: { filename: string } }
) {
  const filename = decodeURIComponent(params.filename);
  if (!isSafeUploadName(filename)) {
    return NextResponse.json({ error: 'Invalid media file name.' }, { status: 400 });
  }

  try {
    const uploadPath = path.join(process.cwd(), 'public', 'uploads', filename);
    const bytes = await readFile(uploadPath);
    const contentType = CONTENT_TYPES[path.extname(filename).toLowerCase()] ?? 'application/octet-stream';

    return new Response(bytes, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Length': String(bytes.length),
        'Content-Type': contentType,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Media file not found.' }, { status: 404 });
  }
}
