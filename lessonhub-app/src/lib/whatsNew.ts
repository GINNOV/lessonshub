import { promises as fs } from "fs";
import path from "path";
import { createHash } from "crypto";

export type WhatsNewPayload = {
  content: string;
  version: string;
};

export type WhatsNewLocale = "us" | "it";

const localeFileMap: Record<WhatsNewLocale, string> = {
  us: "latest.md",
  it: "latestit.md",
};

export async function loadLatestUpgradeNote(locale: WhatsNewLocale = "us"): Promise<WhatsNewPayload | null> {
  try {
    const fileName = localeFileMap[locale];
    const filePath = path.join(process.cwd(), "public", "upgrades", fileName);
    const rawContent = await fs.readFile(filePath, "utf8");
    const content = rawContent.trim();

    if (!content) {
      return null;
    }

    const version = createHash("sha256").update(content).digest("hex").slice(0, 12);
    return { content, version };
  } catch (error) {
    const cause = error as NodeJS.ErrnoException;
    if (cause?.code === "ENOENT") {
      return null;
    }
    console.error(`Failed to load latest upgrade note for locale ${locale}:`, error);
    return null;
  }
}

