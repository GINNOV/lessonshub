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

export default function PrivacyConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const consent = readConsent();
    if (!consent) {
      setIsVisible(true);
      const defaults = getDefaultConsent();
      setAnalytics(defaults.analytics);
      setMarketing(defaults.marketing);
      return;
    }
    setAnalytics(Boolean(consent.analytics));
    setMarketing(Boolean(consent.marketing));
  }, []);

  if (!isVisible) return null;

  const handleAcceptAll = () => {
    saveConsent(buildConsent({ analytics: true, marketing: true }));
    setIsVisible(false);
  };

  const handleReject = () => {
    saveConsent(buildConsent({ analytics: false, marketing: false }));
    setIsVisible(false);
  };

  const handleSave = () => {
    saveConsent(buildConsent({ analytics, marketing }));
    setIsVisible(false);
  };

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-950/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur">
      <div className="space-y-4 text-sm text-slate-200">
        <div>
          <p className="text-base font-semibold text-slate-100">
            We use cookies to run the site and measure usage.
          </p>
          <p className="mt-2 text-slate-400">
            Essential cookies keep LessonHUB working. Optional analytics and
            marketing cookies help us improve the product. You can change your
            preferences at any time.
          </p>
        </div>
        {showOptions && (
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-100">Necessary</p>
                <p className="text-xs text-slate-400">
                  Required to sign in and keep the platform secure.
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-300">Always on</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-100">Analytics</p>
                <p className="text-xs text-slate-400">
                  Helps us understand usage patterns to improve lessons.
                </p>
              </div>
              <Switch
                checked={analytics}
                onCheckedChange={setAnalytics}
                aria-label="Toggle analytics cookies"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-100">Marketing</p>
                <p className="text-xs text-slate-400">
                  Used to personalize communications and outreach.
                </p>
              </div>
              <Switch
                checked={marketing}
                onCheckedChange={setMarketing}
                aria-label="Toggle marketing cookies"
              />
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-slate-700 text-slate-200 hover:bg-slate-900"
            onClick={() => setShowOptions((value) => !value)}
          >
            {showOptions ? "Hide preferences" : "Manage preferences"}
          </Button>
          <Button type="button" variant="outline" onClick={handleReject}>
            Reject non-essential
          </Button>
          {showOptions ? (
            <Button type="button" onClick={handleSave}>
              Save preferences
            </Button>
          ) : (
            <Button type="button" onClick={handleAcceptAll}>
              Accept all
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
