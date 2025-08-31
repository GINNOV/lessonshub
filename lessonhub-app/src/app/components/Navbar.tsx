// file: src/app/components/Navbar.tsx

'use client'; // <-- Convert to a Client Component

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react"; // <-- Import the client-side hook
import SignOutButton from "./SignOutButton";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  // Use the client-side hook to get the session data
  const { data: session, status } = useSession();

  return (
    <header className="bg-white/95 backdrop-blur-sm sticky top-0 z-50 border-b">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-bold text-gray-800">
          LessonHUB
        </Link>
        <div className="flex items-center space-x-4 h-9"> {/* Added h-9 for layout consistency */}
          {status === 'loading' ? (
            // You can add a loading skeleton here for a better UX
            <div className="w-24 h-5 bg-gray-200 rounded animate-pulse"></div>
          ) : session?.user ? (
            <>
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? 'User Avatar'}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <span className="text-sm text-gray-500 hidden sm:block">
                {session.user.email}
              </span>
              <SignOutButton />
            </>
          ) : (
            <Button asChild>
              <Link href="/signin">Sign In</Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}
