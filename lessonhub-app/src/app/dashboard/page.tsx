// file: app/dashboard/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link"; // Import Link

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-24">
      <h1 className="text-4xl font-bold">Teacher Dashboard</h1>
      <p className="mt-4 text-lg text-gray-600">
        Welcome, {session.user?.name}!
      </p>
      <div className="mt-10">
        {/* Change this button to a Link */}
        <Link 
          href="/dashboard/create"
          className="px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Create New Lesson
        </Link>
      </div>
    </div>
  );
}