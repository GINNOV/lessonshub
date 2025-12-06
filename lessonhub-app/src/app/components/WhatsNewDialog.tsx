'use client';

import { useEffect, useMemo, useState } from 'react';
import { marked } from 'marked';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { WhatsNewPayload, WhatsNewLocale } from '@/lib/whatsNew';

type WhatsNewDialogProps = {
  notes: Partial<Record<WhatsNewLocale, WhatsNewPayload | null>>;
  defaultLocale?: WhatsNewLocale;
};

type WhatsNewOpenEventDetail = {
  locale?: WhatsNewLocale | null;
};

const WHATS_NEW_EVENT = 'lessonhub:whatsnew-open';

export function requestWhatsNewDialog(locale?: WhatsNewLocale) {
  if (typeof window === 'undefined') {
    return;
  }
  const detail: WhatsNewOpenEventDetail = { locale: locale ?? null };
  window.dispatchEvent(new CustomEvent<WhatsNewOpenEventDetail>(WHATS_NEW_EVENT, { detail }));
}

function resolveUpgradeAssetPath(href?: string | null) {
  if (!href) return '';
  if (/^(?:[a-z]+:)?\/\//i.test(href) || href.startsWith('/') || href.startsWith('#')) {
    return href;
  }
  const cleaned = href.replace(/^\.\//, '').replace(/^upgrades\//, '');
  return `/upgrades/${cleaned}`;
}

function normalizeUpgradeMarkdown(markdown: string): { title: string; html: string } {
  if (!markdown) {
    return { title: "What's new", html: '' };
  }

  const headingMatch = markdown.match(/^#\s+(.+?)$/m);
  let title = "What's new";
  let body = markdown;

  if (headingMatch) {
    title = headingMatch[1].trim();
    body = markdown.replace(headingMatch[0], '').trim();
  }

  const renderer = new marked.Renderer();
  const originalImage = renderer.image.bind(renderer);
  renderer.image = (token) => {
    const resolved = resolveUpgradeAssetPath(token.href ?? '');
    return originalImage({ ...token, href: resolved });
  };
  const originalLink = renderer.link.bind(renderer);
  renderer.link = (token) => {
    const resolved = resolveUpgradeAssetPath(token.href ?? '');
    return originalLink({ ...token, href: resolved });
  };

  const html = marked.parse(body, { renderer });

  return { title, html: typeof html === 'string' ? html : '' };
}

const storageNamespace = 'lessonhub-whatsnew';
const localeLabels: Record<WhatsNewLocale, string> = {
  us: '🇺🇸 English',
  it: '🇮🇹 Italiano',
};

export default function WhatsNewDialog({ notes, defaultLocale = 'us' }: WhatsNewDialogProps) {
  const availableEntries = useMemo(() => {
    return (Object.entries(notes) as [WhatsNewLocale, WhatsNewPayload | null][])
      .filter(([, payload]) => Boolean(payload?.content?.trim())) as [WhatsNewLocale, WhatsNewPayload][];
  }, [notes]);

  const versionKey = useMemo(() => {
    if (availableEntries.length === 0) return null;
    return availableEntries
      .map(([, payload]) => payload.version)
      .sort((a, b) => a.localeCompare(b))
      .join('::');
  }, [availableEntries]);

  const storageKey = useMemo(() => {
    if (!versionKey) return null;
    return `${storageNamespace}::${versionKey}`;
  }, [versionKey]);

  const initialLocale = useMemo<WhatsNewLocale | null>(() => {
    if (availableEntries.length === 0) return null;
    const locales = availableEntries.map(([locale]) => locale);
    if (locales.includes(defaultLocale)) {
      return defaultLocale;
    }
    return locales[0];
  }, [availableEntries, defaultLocale]);

  const [open, setOpen] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [activeLocale, setActiveLocale] = useState<WhatsNewLocale | null>(initialLocale);

  useEffect(() => {
    setActiveLocale(initialLocale);
  }, [initialLocale]);

  useEffect(() => {
    if (!storageKey || availableEntries.length === 0) {
      return;
    }
    const alreadyAcknowledged = window.localStorage.getItem(storageKey);
    if (!alreadyAcknowledged) {
      setOpen(true);
    }
  }, [storageKey, availableEntries]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (typeof window === 'undefined') {
      setCheckboxChecked(false);
      return;
    }
    if (storageKey) {
      const acknowledged = window.localStorage.getItem(storageKey);
      setCheckboxChecked(Boolean(acknowledged));
    } else {
      setCheckboxChecked(false);
    }
  }, [open, storageKey]);

  const notesMap = useMemo(
    () => Object.fromEntries(availableEntries) as Partial<Record<WhatsNewLocale, WhatsNewPayload>>,
    [availableEntries]
  );
  const currentNote = activeLocale ? notesMap[activeLocale] ?? null : null;
  const normalized = useMemo(
    () => normalizeUpgradeMarkdown(currentNote?.content ?? ''),
    [currentNote]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || availableEntries.length === 0) {
      return;
    }

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<WhatsNewOpenEventDetail>;
      const requestedLocale = customEvent.detail?.locale;
      if (requestedLocale && notesMap[requestedLocale]) {
        setActiveLocale(requestedLocale);
      }
      setOpen(true);
      // checkbox state handled by open-effect
    };

    window.addEventListener(WHATS_NEW_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(WHATS_NEW_EVENT, handler as EventListener);
    };
  }, [availableEntries, notesMap, storageKey]);

  if (availableEntries.length === 0 || !versionKey || !activeLocale || !currentNote) {
    return null;
  }

  const handleConfirm = () => {
    if (!storageKey || !checkboxChecked) return;
    window.localStorage.setItem(storageKey, 'acknowledged');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[80vh] w-full max-w-2xl overflow-auto border border-slate-800/70 bg-slate-950/90 text-slate-50 shadow-2xl"
      >
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-2xl font-bold">{normalized.title}</DialogTitle>
          {availableEntries.length > 1 && (
            <div className="flex items-center gap-2">
              {availableEntries.map(([locale]) => (
                <Button
                  key={locale}
                  type="button"
                  size="sm"
                  variant={activeLocale === locale ? 'default' : 'outline'}
                  onClick={() => setActiveLocale(locale)}
                  className={cn(
                    activeLocale === locale
                      ? 'bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 shadow-[0_10px_30px_rgba(45,212,191,0.25)]'
                      : 'border-slate-700 bg-slate-900/70 text-slate-200'
                  )}
                >
                  {localeLabels[locale]}
                </Button>
              ))}
            </div>
          )}
        </DialogHeader>
        <div
          className={cn(
            'prose prose-sm max-w-none text-left text-slate-200',
            'prose-headings:text-slate-100 prose-strong:text-slate-100 prose-li:marker:text-teal-300',
            'prose-img:rounded-lg prose-img:border prose-img:border-slate-800 prose-a:text-teal-200 prose-a:no-underline hover:prose-a:text-teal-100'
          )}
          dangerouslySetInnerHTML={{ __html: normalized.html }}
        />
        <DialogFooter className="items-center justify-between gap-4 sm:justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="whats-new-ack"
              checked={checkboxChecked}
              onCheckedChange={(value) => setCheckboxChecked(Boolean(value))}
              className="border-slate-700 data-[state=checked]:bg-teal-500"
            />
            <Label htmlFor="whats-new-ack" className="text-sm text-slate-200">
              I&apos;ve read this update. Don&apos;t show it again.
            </Label>
          </div>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!checkboxChecked}
            className="border border-teal-300/60 bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 shadow-[0_12px_35px_rgba(45,212,191,0.35)] hover:brightness-110 disabled:opacity-60"
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
