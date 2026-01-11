export type ConsentPreferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

export const CONSENT_COOKIE_NAME = "lh_consent";

const defaultConsent: ConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  updatedAt: "",
};

function parseConsent(raw: string): ConsentPreferences | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentPreferences> | null;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return null;
  }
}

export function readConsent(): ConsentPreferences | null {
  if (typeof document === "undefined") return null;

  const cookieValue = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${CONSENT_COOKIE_NAME}=`));

  if (cookieValue) {
    const raw = cookieValue.slice(CONSENT_COOKIE_NAME.length + 1);
    const decoded = decodeURIComponent(raw);
    const parsed = parseConsent(decoded);
    if (parsed) return parsed;
  }

  try {
    const stored = window.localStorage.getItem(CONSENT_COOKIE_NAME);
    if (stored) return parseConsent(stored);
  } catch {
    return null;
  }

  return null;
}

export function buildConsent(
  updates: Partial<ConsentPreferences>,
): ConsentPreferences {
  return {
    necessary: true,
    analytics: Boolean(updates.analytics),
    marketing: Boolean(updates.marketing),
    updatedAt: updates.updatedAt ?? new Date().toISOString(),
  };
}

export function saveConsent(next: ConsentPreferences): void {
  if (typeof document === "undefined") return;

  const payload = JSON.stringify(next);
  const encoded = encodeURIComponent(payload);
  const maxAge = 60 * 60 * 24 * 180;

  document.cookie = `${CONSENT_COOKIE_NAME}=${encoded}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;

  try {
    window.localStorage.setItem(CONSENT_COOKIE_NAME, payload);
  } catch {
    // Ignore storage errors (private mode, storage disabled, etc.)
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("lessonhub:consent", { detail: next }),
    );
  }
}

export function getConsentLabel(value: boolean): string {
  return value ? "On" : "Off";
}

export function getDefaultConsent(): ConsentPreferences {
  return { ...defaultConsent };
}
