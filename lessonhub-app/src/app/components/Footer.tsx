import Link from 'next/link';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { parseAcceptLanguage, resolveLocale, UiLanguagePreference } from '@/lib/locale';

export default async function Footer() {
  const session = await auth();
  const preference = ((session?.user as any)?.uiLanguage as UiLanguagePreference) ?? 'device';
  const headerList = await headers();
  const acceptLanguage = headerList.get('accept-language');
  const detectedLocales = parseAcceptLanguage(acceptLanguage);
  const locale = resolveLocale({
    preference,
    detectedLocales,
    supportedLocales: ['en', 'it'],
    fallback: 'en',
  });
  const copy = locale === 'it'
    ? {
        buildLabel: 'Build',
        lastUpdateLabel: 'Ultimo aggiornamento',
        about: 'Chi siamo',
        contact: 'Contatti',
        privacy: 'Privacy',
        cookies: 'Cookie',
        docs: 'Documentazione',
      }
    : {
        buildLabel: 'Build',
        lastUpdateLabel: 'Last update',
        about: 'About Us',
        contact: 'Contact Us',
        privacy: 'Privacy',
        cookies: 'Cookie settings',
        docs: 'Docs',
      };
  const currentYear = new Date().getFullYear();
  
  const rawSha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    '';
  const buildVersion = rawSha ? rawSha.substring(0, 7) : 'dev';
  const rawTimestamp =
    process.env.VERCEL_GIT_COMMIT_TIMESTAMP ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_TIMESTAMP ||
    '';
  const lastUpdate = (() => {
    if (rawTimestamp) {
      const numeric = Number(rawTimestamp);
      if (Number.isFinite(numeric) && numeric > 0) {
        const ms = rawTimestamp.length <= 10 ? numeric * 1000 : numeric;
        const date = new Date(ms);
        if (!Number.isNaN(date.getTime())) {
          return date.toISOString().slice(0, 10);
        }
      }
    }
    const fallback = new Date();
    return fallback.toISOString().slice(0, 10);
  })();
  const docsUrl = '/docs';

  return (
    <footer className="mt-auto border-t border-slate-800/70 bg-slate-950/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-2 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span>© {currentYear} Garage Innovation LLC</span>
          <span className="text-slate-700">|</span>
          <span>{copy.buildLabel}: {buildVersion}</span>
          <span className="text-slate-700">|</span>
          <span>{copy.lastUpdateLabel} {lastUpdate}</span>
        </div>
        <nav className="flex flex-wrap items-center gap-4">
          <Link href="/about" className="hover:text-slate-200 transition-colors">{copy.about}</Link>
          <Link href="/contact" className="hover:text-slate-200 transition-colors">{copy.contact}</Link>
          <Link href="/privacy" className="hover:text-slate-200 transition-colors">{copy.privacy}</Link>
          <Link href="/privacy#cookie-preferences" className="hover:text-slate-200 transition-colors">
            {copy.cookies}
          </Link>
          {docsUrl && (
            <Link href={docsUrl} className="hover:text-slate-200 transition-colors" target="_blank" rel="noopener noreferrer">
              {copy.docs}
            </Link>
          )}
        </nav>
      </div>
    </footer>
  );
}
