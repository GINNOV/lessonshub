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
    // Try to load sharp at runtime (works only on Node.js runtime)
    let processedBuffer: Buffer;
    try {
      const sharp = (await import('sharp')).default;

      // Convert the request body to a Buffer
      const imageBuffer = Buffer.from(await request.arrayBuffer());

      // Resize and compress using sharp
      processedBuffer = await sharp(imageBuffer)
        .resize({
          width: 800,
          height: 800,
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (e) {
      // If sharp isn't installed/available, fall back to original bytes
      console.warn('sharp not available, uploading original bytes', e);
      processedBuffer = Buffer.from(await request.arrayBuffer());
    }

    // Upload the processed image buffer to Vercel Blob
    const blob = await put(filename, processedBuffer, {
      access: 'public',
      contentType: 'image/jpeg', // Set the content type for the new image
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