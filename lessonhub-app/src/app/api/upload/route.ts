// file: src/app/api/upload/route.ts

export const runtime = 'nodejs';

import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { auth } from "@/auth";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename || !request.body) {
    return new NextResponse(JSON.stringify({ error: "No filename or file body provided" }), { status: 400 });
  }

  try {
    const lowerFilename = filename.toLowerCase();
    const isImage =
      lowerFilename.endsWith('.jpg') ||
      lowerFilename.endsWith('.jpeg') ||
      lowerFilename.endsWith('.png') ||
      lowerFilename.endsWith('.webp') ||
      lowerFilename.endsWith('.gif');
    const isGif = lowerFilename.endsWith('.gif');
    const isPlainText = lowerFilename.endsWith('.lrc') || lowerFilename.endsWith('.txt');

    const originalBuffer = Buffer.from(await request.arrayBuffer());
    // Try to load sharp at runtime (works only on Node.js runtime)
    let processedBuffer: Buffer;
    let contentType = 'application/octet-stream';

    if (isImage && !isGif) {
      try {
        const sharp = (await import('sharp')).default;
        processedBuffer = await sharp(originalBuffer)
          .resize({
            width: 800,
            height: 800,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 80 })
          .toBuffer();
        contentType = 'image/jpeg';
      } catch (e) {
        console.warn('sharp not available, uploading original bytes', e);
        processedBuffer = originalBuffer;
        contentType = 'application/octet-stream';
      }
    } else if (isGif) {
      processedBuffer = originalBuffer;
      contentType = 'image/gif';
    } else {
      processedBuffer = originalBuffer;
      contentType = isPlainText ? 'text/plain' : 'application/octet-stream';
    }

    const body = new Blob([new Uint8Array(processedBuffer)], { type: contentType });
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing BLOB_READ_WRITE_TOKEN for uploads.' }),
        { status: 500 }
      );
    }
    // Upload the processed image buffer to Vercel Blob
    const blob = await put(filename, body, {
      contentType,
      access: 'public',
      token: blobToken,
    });

    return NextResponse.json(blob);

  } catch (error) {
    console.error("IMAGE_PROCESSING_ERROR", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to process and upload image." }),
      { status: 500 }
    );
  }
}
