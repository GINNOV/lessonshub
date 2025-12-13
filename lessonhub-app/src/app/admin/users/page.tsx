// file: src/app/admin/users/page.tsx

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getAllUsers } from "@/actions/adminActions";
import UserTable from "@/app/components/UserTable";
import { Role } from "@prisma/client";

export default async function UserManagementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const hasAdminAccess = session && (session.user.role === Role.ADMIN || session.user.hasAdminPortalAccess);
  if (!hasAdminAccess) {
    redirect("/");
  }

  const users = await getAllUsers();

  const serializableUsers = users.map(user => ({
    ...user,
    defaultLessonPrice: user.defaultLessonPrice?.toNumber() ?? null,
    referralRewardPercent: user.referralRewardPercent?.toNumber() ?? null,
    referralRewardMonthlyAmount: user.referralRewardMonthlyAmount?.toNumber() ?? null,
  }));

  const params = await searchParams;
  const searchTerm = typeof params?.search === "string" ? params.search : "";

  return (
    <div className="space-y-6 text-slate-100">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-3xl font-bold">User Management</h1>
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
        <UserTable users={serializableUsers} searchTerm={searchTerm} />
      </div>
    </div>
  );
}
