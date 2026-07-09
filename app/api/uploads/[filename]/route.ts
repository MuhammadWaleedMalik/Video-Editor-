import { createReadStream } from 'fs';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { Readable } from 'stream';

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

function parseRange(rangeHeader: string | null, size: number) {
  if (!rangeHeader?.startsWith('bytes=')) return null;
  const [rawStart, rawEnd] = rangeHeader.slice(6).split('-');
  const start = rawStart ? Number.parseInt(rawStart, 10) : 0;
  const end = rawEnd ? Number.parseInt(rawEnd, 10) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) {
    return null;
  }
  return { start, end: Math.min(end, size - 1) };
}

async function serveUpload(
  request: Request,
  { params }: { params: { filename: string } },
  headOnly = false
) {
  const filename = decodeURIComponent(params.filename);
  if (!isSafeUploadName(filename)) {
    return NextResponse.json({ error: 'Invalid media file name.' }, { status: 400 });
  }

  try {
    const uploadPath = path.join(process.cwd(), 'public', 'uploads', filename);
    const fileStat = await stat(uploadPath);
    const contentType = CONTENT_TYPES[path.extname(filename).toLowerCase()] ?? 'application/octet-stream';
    const range = parseRange(request.headers.get('range'), fileStat.size);
    const baseHeaders = {
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
      'Content-Type': contentType,
    };

    if (range) {
      const length = range.end - range.start + 1;
      const stream = headOnly ? null : Readable.toWeb(createReadStream(uploadPath, { start: range.start, end: range.end }));
      return new Response(stream as BodyInit | null, {
        status: 206,
        headers: {
          ...baseHeaders,
          'Content-Length': String(length),
          'Content-Range': `bytes ${range.start}-${range.end}/${fileStat.size}`,
        },
      });
    }

    if (headOnly) {
      return new Response(null, {
        headers: {
          ...baseHeaders,
          'Content-Length': String(fileStat.size),
        },
      });
    }

    const bytes = await readFile(uploadPath);
    return new Response(bytes, {
      headers: {
        ...baseHeaders,
        'Content-Length': String(bytes.length),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Media file not found.' }, { status: 404 });
  }
}

export async function GET(
  request: Request,
  context: { params: { filename: string } }
) {
  return serveUpload(request, context);
}

export async function HEAD(
  request: Request,
  context: { params: { filename: string } }
) {
  return serveUpload(request, context, true);
}
