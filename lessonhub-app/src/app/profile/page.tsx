// file: src/app/profile/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ProfileForm from "@/app/components/ProfileForm";
import prisma from "@/lib/prisma";

export default async function ProfilePage() {
  const session = await auth();

  if (!session) {
    redirect("/signin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    // This case should be rare if the session is valid
    redirect("/signin");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
      <ProfileForm userToEdit={user} />
    </div>
  );
}