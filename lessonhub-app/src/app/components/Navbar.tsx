// file: src/app/components/Navbar.tsx

import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import AuthButton from "./AuthButton";

export default async function Navbar() {
  const session = await getServerSession(authOptions);

  return (
    <header className="bg-white shadow-md">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-gray-800">
          LessonHub
        </Link>
        <div className="flex items-center space-x-4">
          {session?.user ? (
            <>
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? 'User Avatar'}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              )}
              <span className="text-gray-700 hidden sm:block">
                Welcome, {session.user.name}
              </span>
              <AuthButton />
            </>
          ) : (
            <AuthButton />
          )}
        </div>
      </nav>
    </header>
  );
}