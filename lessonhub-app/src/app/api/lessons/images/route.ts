// file: src/app/api/lessons/images/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { Role } from '@prisma/client';
import { getUploadedImages } from '@/actions/lessonActions';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.TEACHER) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const images = await getUploadedImages();
  return NextResponse.json({ images });
}
