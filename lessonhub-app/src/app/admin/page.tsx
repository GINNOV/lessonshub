import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import Link from "next/link";
import WhatsNewDialog from "@/app/components/WhatsNewDialog";
import { loadLatestUpgradeNote } from "@/lib/whatsNew";
import { ADMIN_TILES } from "@/lib/adminTiles";

export default async function AdminLandingPage() {
  const session = await auth();
  if (!session) redirect("/signin");
  const hasAdminAccess = session.user.role === Role.ADMIN || session.user.hasAdminPortalAccess;
  if (!hasAdminAccess) redirect("/dashboard");

  const [whatsNewUS, whatsNewIT] = await Promise.all([
    loadLatestUpgradeNote("us"),
    loadLatestUpgradeNote("it"),
  ]);
  const whatsNewNotes = {
    us: whatsNewUS,
    it: whatsNewIT,
  };

  return (
    <div className="p-6">
      <WhatsNewDialog notes={whatsNewNotes} />
      <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-gray-600 mb-8">Quick access to admin tools.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {ADMIN_TILES.map(({ href, label, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className={`block rounded-xl border ${color} p-8 text-center shadow-sm hover:shadow-lg transition-shadow`}
          >
            <div className="flex flex-col items-center gap-3">
              <Icon className="h-10 w-10" />
              <span className="text-lg font-semibold">{label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
