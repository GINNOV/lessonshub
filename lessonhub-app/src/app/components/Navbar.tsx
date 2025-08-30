// file: src/app/components/Navbar.tsx

import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth"; 
import SignOutButton from "./SignOutButton";
import { Button } from "@/components/ui/button";

export default async function Navbar() {
  const session = await auth();

  return (
    <header className="bg-white/95 backdrop-blur-sm sticky top-0 z-50 border-b">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-bold text-gray-800">
          LessonHub
        </Link>
        <div className="flex items-center space-x-4">
          {session?.user ? (
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