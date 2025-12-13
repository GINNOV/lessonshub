// file: src/app/admin/settings/page.tsx
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getDashboardSettings } from "@/actions/adminActions";
import SettingsForm from "@/app/components/SettingsForm";
import SignOutAllUsersButton from "@/app/components/SignOutAllUsersButton";

export default async function SettingsPage() {
  const session = await auth();
  const hasAdminAccess = session && (session.user.role === Role.ADMIN || session.user.hasAdminPortalAccess);
  if (!hasAdminAccess) {
    redirect("/");
  }

  const settings = await getDashboardSettings();

  return (
    <div className="space-y-6 text-slate-100">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-3xl font-bold">Dashboard Settings</h1>
        <div className="flex gap-2">
          <Link
            href="/admin"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-teal-400/60"
          >
            ← Admin home
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-teal-400/60"
          >
            ← Teacher dashboard
          </Link>
        </div>
      </div>
      <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
        <SettingsForm initialSettings={settings} />
      </div>

      <div className="rounded-xl border border-rose-500/50 bg-rose-900/40 p-6 shadow-xl">
        <h2 className="text-2xl font-bold mb-3 text-rose-100">Danger Zone</h2>
        <p className="mb-4 text-rose-100/80">
          Actions here can cause significant disruption. Please be certain.
        </p>
        <SignOutAllUsersButton />
      </div>
    </div>
  );
}
