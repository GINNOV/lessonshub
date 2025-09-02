// file: src/app/profile/page.tsx

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ProfileForm from "@/app/components/ProfileForm";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) {
    redirect("/signin");
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Edit Your Profile</h1>
      <div className="bg-white p-6 rounded-lg shadow-md border">
        <ProfileForm />
      </div>
    </div>
  );
}