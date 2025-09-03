// file: src/app/api/lessons/test-link/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { url } = await request.json();

  if (!url) {
    return new NextResponse(JSON.stringify({ error: "URL is required" }), { status: 400 });
  }

  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (response.ok) {
      return new NextResponse(JSON.stringify({ success: true, status: response.status }), { status: 200 });
    } else {
      return new NextResponse(JSON.stringify({ success: false, status: response.status }), { status: 200 });
    }
  } catch (error) {
    return new NextResponse(JSON.stringify({ success: false, error: "Failed to fetch the URL" }), { status: 200 });
  }
}