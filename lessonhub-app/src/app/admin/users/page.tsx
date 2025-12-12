// file: src/app/admin/users/page.tsx

import { redirect } from "next/navigation";
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
    <div>
      <h1 className="text-3xl font-bold mb-6">User Management</h1>
      <div className="bg-white p-6 rounded-lg shadow-md border">
        <UserTable users={serializableUsers} searchTerm={searchTerm} />
      </div>
    </div>
  );
}
