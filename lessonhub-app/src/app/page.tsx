// file: app/page.tsx

import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import AuthButton from "./components/AuthButton";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Welcome to LessonHub
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          The platform for modern learning.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4">
          <AuthButton />
          {/* This link will only show if the user is signed in */}
          {session && (
            <Link
              href="/dashboard"
              className="px-6 py-3 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
              Go to Dashboard
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}