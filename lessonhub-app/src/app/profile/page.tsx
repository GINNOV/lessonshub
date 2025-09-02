import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) {
    redirect("/signin");
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Profile</h1>
      <div className="mt-6 bg-white p-6 rounded-lg shadow-md border">
        <p><strong>Name:</strong> {session.user?.name ?? 'N/A'}</p>
        <p><strong>Email:</strong> {session.user?.email}</p>
        <p><strong>Role:</strong> {session.user?.role}</p>
      </div>
    </div>
  );
}