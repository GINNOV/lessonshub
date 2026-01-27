import React from 'react';
import fs from 'fs';
import path from 'path';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { parseAcceptLanguage, resolveLocale, UiLanguagePreference } from '@/lib/locale';
import DocsSidebar from './DocsSidebar';
import docsMetaEn from '@/pages/docs/_meta.json';
import docsMetaIt from '@/pages/docs/it/_meta.json';

export const metadata = {
  title: 'LessonHub Documentation',
};

async function getDocsMeta(locale: string) {
  const folder = locale === 'it' ? 'src/pages/docs/it' : 'src/pages/docs';
  const metaPath = path.join(process.cwd(), folder, '_meta.json');
  try {
    const content = fs.readFileSync(metaPath, 'utf8');
    return JSON.parse(content) as Record<string, string>;
  } catch (error) {
    console.error(`Error reading _meta.json for locale ${locale}:`, error);
    if (locale === 'it') {
      return (docsMetaIt as Record<string, string>) ?? (docsMetaEn as Record<string, string>);
    }
    return (docsMetaEn as Record<string, string>) ?? {};
  }
}

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const headerList = await headers();
  const acceptLanguage = headerList.get('accept-language');
  const detectedLocales = parseAcceptLanguage(acceptLanguage);
  
  const preference = ((session?.user as any)?.uiLanguage as UiLanguagePreference) ?? 'device';
  
  const locale = resolveLocale({
    preference,
    detectedLocales,
    supportedLocales: ['en', 'it'],
    fallback: 'en',
  });

  const meta = await getDocsMeta(locale);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="sticky top-24">
            <DocsSidebar meta={meta} locale={locale} />
          </div>
        </aside>
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
