// file: src/app/extras/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Role } from '@prisma/client';
import ExtrasDashboard from '@/app/extras/ExtrasDashboard';
import { loadLatestUpgradeNote } from '@/lib/whatsNew';
import { parseAcceptLanguage, resolveLocale, UiLanguagePreference } from '@/lib/locale';

export const dynamic = 'force-dynamic';

export default async function ExtrasPage() {
  const session = await auth();

  if (!session) {
    redirect('/signin');
  }

  const headerList = await headers();
  const detectedLocales = parseAcceptLanguage(headerList.get('accept-language'));
  const preference = ((session.user as any)?.uiLanguage as UiLanguagePreference) ?? 'device';
  const locale = resolveLocale({
    preference,
    detectedLocales,
    supportedLocales: ['en', 'it'] as const,
    fallback: 'en',
  }) as 'en' | 'it';

  const [whatsNewUS, whatsNewIT] = await Promise.all([
    loadLatestUpgradeNote('us'),
    loadLatestUpgradeNote('it'),
  ]);

  const whatsNewNotes = {
    us: whatsNewUS,
    it: whatsNewIT,
  };
  const whatsNewLocale = locale === 'it' ? 'it' : 'us';

  const user = session.user as any;

  return (
    <div className="p-6 text-slate-100">
      <ExtrasDashboard
        user={{
          role: user.role as Role,
          hasAdminPortalAccess: Boolean(user.hasAdminPortalAccess),
          name: user.name ?? null,
        }}
        locale={locale}
        whatsNewNotes={whatsNewNotes}
        whatsNewLocale={whatsNewLocale}
      />
    </div>
  );
}
