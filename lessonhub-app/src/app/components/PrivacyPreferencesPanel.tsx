"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  buildConsent,
  getDefaultConsent,
  readConsent,
  saveConsent,
} from "@/lib/consent";

interface PrivacyPreferencesPanelProps {
  hideTitle?: boolean;
  className?: string;
}

export default function PrivacyPreferencesPanel({
  hideTitle = false,
  className = "",
}: PrivacyPreferencesPanelProps) {
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const consent = readConsent();
    const defaults = consent ?? getDefaultConsent();
    setAnalytics(Boolean(defaults.analytics));
    setMarketing(Boolean(defaults.marketing));
    setHasLoaded(true);
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    saveConsent(buildConsent({ analytics, marketing }));
    setTimeout(() => setIsSaving(false), 300);
  };

  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-950/70 p-6 shadow-xl ${className}`.trim()}>
      {!hideTitle && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-100">Cookie settings</h3>
          <p className="text-sm text-slate-400">
            Control optional cookies used for analytics and marketing. Necessary
            cookies are always enabled to keep the platform secure.
          </p>
        </div>
      )}
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <div>
            <p className="font-medium text-slate-100">Necessary</p>
            <p className="text-xs text-slate-400">Always on</p>
          </div>
          <span className="text-xs font-semibold text-emerald-300">Enabled</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <div>
            <p className="font-medium text-slate-100">Analytics</p>
            <p className="text-xs text-slate-400">
              Measure feature usage to improve LessonHUB.
            </p>
          </div>
          <Switch
            checked={analytics}
            onCheckedChange={setAnalytics}
            disabled={!hasLoaded}
            aria-label="Toggle analytics cookies"
          />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <div>
            <p className="font-medium text-slate-100">Marketing</p>
            <p className="text-xs text-slate-400">
              Used to personalize communications and outreach.
            </p>
          </div>
          <Switch
            checked={marketing}
            onCheckedChange={setMarketing}
            disabled={!hasLoaded}
            aria-label="Toggle marketing cookies"
          />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={!hasLoaded || isSaving}>
          {isSaving ? "Saving..." : "Save preferences"}
        </Button>
        <span className="text-xs text-slate-500">
          Changes apply to this device and browser.
        </span>
      </div>
    </div>
  );
}
