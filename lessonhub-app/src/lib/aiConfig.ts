import prisma from "@/lib/prisma";

/**
 * Returns the configured Gemini API key.
 * Priority:
 * 1) Public env var (NEXT_PUBLIC_GEMINI_API_KEY)
 * 2) Server env var (GEMINI_API_KEY)
 * 3) Stored AppConfig entry
 */
export async function getGeminiApiKey(): Promise<string | null> {
  const envPublic = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (envPublic) return envPublic;
  const envPrivate = process.env.GEMINI_API_KEY;
  if (envPrivate) return envPrivate;

  try {
    const config = await prisma.appConfig.findUnique({
      where: { id: 1 },
      select: { geminiApiKey: true },
    });
    return config?.geminiApiKey ?? null;
  } catch (error) {
    console.error("Failed to load Gemini API key from AppConfig", error);
    return null;
  }
}
