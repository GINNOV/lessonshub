"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { readConsent } from "@/lib/consent";

export default function AnalyticsGate() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const consent = readConsent();
    setEnabled(Boolean(consent?.analytics));

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent).detail as
        | { analytics?: boolean }
        | undefined;
      if (detail && typeof detail.analytics !== "undefined") {
        setEnabled(Boolean(detail.analytics));
        return;
      }
      const refreshed = readConsent();
      setEnabled(Boolean(refreshed?.analytics));
    };

    window.addEventListener("lessonhub:consent", handleUpdate);
    return () => window.removeEventListener("lessonhub:consent", handleUpdate);
  }, []);

  if (!enabled) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
