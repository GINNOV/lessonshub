export type UiLanguagePreference = "device" | "en" | "it";

type SupportedLocale = "en" | "it" | "es";

const normalize = (value: string) => value.toLowerCase();

export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => part.trim().split(";")[0].toLowerCase())
    .filter(Boolean);
}

export function resolveLocale({
  preference,
  detectedLocales,
  supportedLocales,
  fallback = "en",
}: {
  preference?: UiLanguagePreference | null;
  detectedLocales?: string[];
  supportedLocales: SupportedLocale[];
  fallback?: SupportedLocale;
}): SupportedLocale {
  const normalizedSupported = supportedLocales.map(normalize);
  if (preference && preference !== "device") {
    const normalizedPreference = normalize(preference);
    if (normalizedSupported.includes(normalizedPreference)) {
      return normalizedPreference as SupportedLocale;
    }
  }

  const haystack = detectedLocales?.map(normalize) ?? [];
  for (const locale of haystack) {
    const match = normalizedSupported.find((candidate) =>
      locale.startsWith(candidate),
    );
    if (match) return match as SupportedLocale;
  }

  return (fallback ?? "en") as SupportedLocale;
}
