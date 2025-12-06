import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGeminiApiKey } from "@/lib/aiConfig";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ geminiApiKey: null }, { status: 401 });
  }

  const geminiApiKey = await getGeminiApiKey();
  if (!geminiApiKey) {
    return NextResponse.json({ geminiApiKey: null }, { status: 404 });
  }

  return NextResponse.json({ geminiApiKey });
}
