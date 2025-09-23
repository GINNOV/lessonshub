// file: src/app/components/Navbar.tsx
'use client';

import Link from "next/link";
import { useSession } from "next-auth/react";
import SignOutButton from "./SignOutButton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Role } from "@prisma/client";
import { stopImpersonation } from "@/actions/adminActions";
import { useRouter } from 'next/navigation';
import { useState } from "react";
import ReferralDialog from "./ReferralDialog";
import FeedbackDialog from "./FeedbackDialog";

export default function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as any;
  const [isReferralDialogOpen, setIsReferralDialogOpen] = useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);

  const homeHref =
    status === 'authenticated'
      ? user?.role === Role.TEACHER || user?.role === Role.ADMIN
        ? '/dashboard'
        : '/my-lessons'
      : '/';

  const handleStopImpersonation = async () => {
    const result = await stopImpersonation();
    if (result.success) {
      router.push('/dashboard');
      router.refresh();
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      {user?.impersonating && (
        <div className="bg-yellow-400 text-center p-2 text-sm">
          You are impersonating {user.name}.{' '}
          <button onClick={handleStopImpersonation} className="underline font-bold">
            Stop Impersonating
          </button>
        </div>
      )}
      <header className="bg-white/95 backdrop-blur-sm sticky top-0 z-50 border-b">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <Link href={homeHref} className="text-lg font-bold text-gray-800">
            🏠 LessonHUB
          </Link>
          <div className="flex items-center space-x-4">
            {status === 'loading' ? (
              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
            ) : session?.user ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring rounded-full">
                      <Avatar>
                        {session.user.image && <AvatarImage src={session.user.image} alt={session.user.name ?? 'User Avatar'} />}
                        <AvatarFallback>{getInitials(session.user.name)}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="font-normal text-sm text-gray-500">{session.user.email}</div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {user?.role === Role.ADMIN && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/users">User Management</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/lessons">Lesson Management</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/emails">Email Editor</Link>
                        </DropdownMenuItem>
                         <DropdownMenuItem asChild>
                          <Link href="/admin/settings">Dashboard Settings</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/cron">Cron Test Page</Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href="/profile">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsReferralDialogOpen(true)}>
                      Refer a student
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsFeedbackDialogOpen(true)}>
                      Send Feedback
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <SignOutButton />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <ReferralDialog open={isReferralDialogOpen} onOpenChange={setIsReferralDialogOpen} />
                <FeedbackDialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen} />
              </>
            ) : (
              <Button asChild>
                <Link href="/signin">Sign In</Link>
              </Button>
            )}
          </div>
        </nav>
      </header>
    </>
  );
}