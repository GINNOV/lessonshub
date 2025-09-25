// file: src/app/admin/users/[userId]/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import UserProfileTabs from "@/app/components/UserProfileTabs";

export default async function UserProfilePage({
  params,
}: {
  params: { userId: string };
}) {
  const session = await auth();
  if (!session || session.user.role !== Role.ADMIN) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    include: {
      assignments: {
        include: {
          lesson: true,
        },
        orderBy: {
          assignedAt: "desc",
        },
      },
    },
  });

  if (!user) {
    return (
      <div>
        <h1 className="text-2xl font-bold">User Not Found</h1>
        <Button asChild variant="outline" className="mt-4">
            <Link href="/admin/users">&larr; Back to User Management</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
        <div className="mb-6 flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold">{user.name || user.email}</h1>
                <p className="text-muted-foreground">
                    Role: {user.role}
                </p>
            </div>
            <Button variant="outline" asChild>
                <Link href="/admin/users">&larr; Back to User Management</Link>
            </Button>
        </div>
        <UserProfileTabs user={user} />
    </div>
  );
}