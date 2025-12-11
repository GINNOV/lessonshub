// file: src/app/admin/settings/page.tsx
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
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard Settings</h1>
      <div className="bg-card p-6 rounded-lg shadow-md border border-border mb-8">
        <SettingsForm initialSettings={settings} />
      </div>

      <h2 className="text-2xl font-bold mb-4 text-destructive">Danger Zone</h2>
      <div className="bg-destructive/10 p-6 rounded-lg shadow-md border border-destructive/20">
        <p className="mb-4 text-foreground">
          Actions here can cause significant disruption. Please be certain.
        </p>
        <SignOutAllUsersButton />
      </div>
    </div>
  );
}
