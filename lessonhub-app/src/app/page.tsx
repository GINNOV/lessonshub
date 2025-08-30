// file: src/app/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  // This check is now more robust
  if (session && session.user) {
    if (session.user.role === Role.TEACHER) {
      redirect('/dashboard');
    } else {
      redirect('/my-lessons');
    }
  }

  // This content will only be shown to users who are NOT logged in
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Welcome to LessonHub
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          The platform for modern learning.
        </p>
        <div className="mt-10">
          <Link 
            href="/signin" 
            className="px-4 py-2 font-semibold text-white bg-blue-500 rounded-md hover:bg-blue-600"
          >
            Sign In or Register
          </Link>
        </div>
      </div>
    </main>
  );
}
