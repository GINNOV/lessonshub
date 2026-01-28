import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import Link from "next/link";
import WhatsNewDialog from "@/app/components/WhatsNewDialog";
import { loadLatestUpgradeNote } from "@/lib/whatsNew";
import { ADMIN_TILES } from "@/lib/adminTiles";
import { headers } from "next/headers";
import { parseAcceptLanguage, resolveLocale, UiLanguagePreference } from "@/lib/locale";

export default async function AdminLandingPage() {
  const session = await auth();
  if (!session) redirect("/signin");
  const hasAdminAccess = session.user.role === Role.ADMIN || session.user.hasAdminPortalAccess;
  if (!hasAdminAccess) redirect("/dashboard");

  const headerList = await headers();
  const detectedLocales = parseAcceptLanguage(headerList.get("accept-language"));
  const preference = ((session.user as any)?.uiLanguage as UiLanguagePreference) ?? "device";
  const locale = resolveLocale({
    preference,
    detectedLocales,
    supportedLocales: ["en", "it"] as const,
    fallback: "en",
  });

  const [whatsNewUS, whatsNewIT] = await Promise.all([
    loadLatestUpgradeNote("us"),
    loadLatestUpgradeNote("it"),
  ]);
  const whatsNewNotes = {
    us: whatsNewUS,
    it: whatsNewIT,
  };
  const whatsNewLocale = locale === "it" ? "it" : "us";

  return (
    <div className="p-2 sm:p-0 text-slate-100">
      <WhatsNewDialog notes={whatsNewNotes} defaultLocale={whatsNewLocale} />
      <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-slate-400 mb-8">Quick access to admin tools.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {ADMIN_TILES.map(({ href, label, icon: Icon, color, iconClass }) => (
          <Link
            key={href}
            href={href}
            className={`block rounded-2xl p-8 text-center shadow-lg transition-all ${color}`}
          >
            <div className="flex flex-col items-center gap-3">
              <Icon className={`h-10 w-10 ${iconClass}`} />
              <span className="text-lg font-semibold">{label}</span>
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-8 flex justify-start">
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-xl border border-teal-400/60 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-100 shadow-lg hover:border-teal-300 hover:text-white"
        >
          ← Back to Teacher Dashboard
        </Link>
      </div>
    </div>
  );
}
