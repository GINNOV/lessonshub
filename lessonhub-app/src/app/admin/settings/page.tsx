// file: src/app/admin/settings/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getDashboardSettings } from "@/actions/adminActions";
import SettingsForm from "@/app/components/SettingsForm";

export default async function SettingsPage() {
  const session = await auth();

  if (!session || session.user.role !== Role.ADMIN) {
    redirect("/");
  }

  const settings = await getDashboardSettings();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard Settings</h1>
      <div className="bg-white p-6 rounded-lg shadow-md border">
        <SettingsForm initialSettings={settings} />
      </div>
    </div>
  );
}