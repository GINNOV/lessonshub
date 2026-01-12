import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGeminiApiKey } from "@/lib/aiConfig";
import { hasAdminPrivileges } from "@/lib/authz";

export async function GET() {
  const session = await auth();
  if (!session?.user || !hasAdminPrivileges(session.user)) {
    return NextResponse.json({ geminiApiKey: null }, { status: 401 });
  }

  const geminiApiKey = await getGeminiApiKey();
  if (!geminiApiKey) {
    return NextResponse.json({ geminiApiKey: null }, { status: 404 });
  }

  return NextResponse.json({ geminiApiKey });
}
