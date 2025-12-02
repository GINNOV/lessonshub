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
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from "react";
import TeacherClassNotesDialog from "./TeacherClassNotesDialog";
import FeedbackDialog from "./FeedbackDialog";
import { requestWhatsNewDialog } from "./WhatsNewDialog";
import RateTeacherDialog from "./RateTeacherDialog";
import { cn } from "@/lib/utils";
import { resolveLocale, UiLanguagePreference } from "@/lib/locale";

type NavLocale = 'en' | 'it';

const navTranslations: Record<NavLocale, Record<string, string>> = {
  en: {
    impersonatingPrefix: 'You are impersonating',
    stopImpersonating: 'Stop Impersonating',
    userManagement: 'User Management',
    lessonManagement: 'Lesson Management',
    referralDashboard: 'Referral Dashboard',
    emailEditor: 'Email Editor',
    dashboardSettings: 'Dashboard Settings',
    cronTestPage: 'Cron Test Page',
    manageClasses: 'Manage Classes',
    settings: 'Settings',
    sendNotes: 'Send notes to students',
    profile: 'Profile',
    adminDashboard: 'Admin dashboard',
    whatsNew: "What's new",
    rateTeacher: 'Rate your teacher',
    sendFeedback: 'Send Feedback',
    signOut: 'Sign Out',
    benefits: 'Benefits',
    testimonials: 'Testimonials',
    signIn: 'Sign In',
    startFreeTrial: 'Start Free Trial',
  },
  it: {
    impersonatingPrefix: 'Stai impersonando',
    stopImpersonating: 'Interrompi impersonificazione',
    userManagement: 'Gestione utenti',
    lessonManagement: 'Gestione lezioni',
    referralDashboard: 'Dashboard referenze',
    emailEditor: 'Editor email',
    dashboardSettings: 'Impostazioni dashboard',
    cronTestPage: 'Pagina test cron',
    manageClasses: 'Gestisci classi',
    settings: 'Impostazioni',
    sendNotes: 'Invia note agli studenti',
    profile: 'Profilo',
    adminDashboard: 'Dashboard admin',
    whatsNew: 'Novità',
    rateTeacher: 'Valuta il tuo insegnante',
    sendFeedback: 'Invia feedback',
    signOut: 'Esci',
    benefits: 'Vantaggi',
    testimonials: 'Testimonianze',
    signIn: 'Accedi',
    startFreeTrial: 'Inizia prova gratuita',
  },
};

export default function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const user = session?.user as any;
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isClassNotesDialogOpen, setIsClassNotesDialogOpen] = useState(false);
  const [isRateTeacherDialogOpen, setIsRateTeacherDialogOpen] = useState(false);
  const [locale, setLocale] = useState<NavLocale>('en');
  const hasAdminAccess = user && (user.role === Role.ADMIN || user.hasAdminPortalAccess);
  const isLanding = pathname === '/';
  const copy = navTranslations[locale];

  useEffect(() => {
    const preferredLanguage = (user?.uiLanguage as UiLanguagePreference) ?? 'device';
    const detectedLocales =
      typeof navigator !== 'undefined'
        ? (navigator.languages?.length ? navigator.languages : [navigator.language]).filter(Boolean)
        : [];
    const resolved = resolveLocale({
      preference: preferredLanguage,
      detectedLocales,
      supportedLocales: ['en', 'it'] as const,
      fallback: 'en',
    }) as NavLocale;
    setLocale(resolved);
  }, [user?.uiLanguage]);

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
          {copy.impersonatingPrefix} {user.name}.{' '}
          <button onClick={handleStopImpersonation} className="underline font-bold">
            {copy.stopImpersonating}
          </button>
        </div>
      )}
      <header
        className={cn(
          "sticky top-0 z-50 border-b border-slate-800/70 bg-slate-950/80 backdrop-blur-xl transition-colors shadow-[0_10px_40px_rgba(7,11,26,0.55)]",
          isLanding && "bg-slate-950/70"
        )}
      >
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between text-slate-100">
          <Link
            href={homeHref}
            className={cn(
              "text-lg font-semibold tracking-tight text-slate-100 hover:text-teal-200",
              isLanding && "drop-shadow-[0_10px_30px_rgba(20,184,166,0.35)]"
            )}
          >
            LessonHUB
          </Link>
          <div className="flex items-center space-x-4">
            {status === 'loading' ? (
              <div className="h-10 w-10 rounded-full bg-slate-800 animate-pulse"></div>
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
                      <div className="text-sm font-normal text-slate-400">{session.user.email}</div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {user?.role === Role.ADMIN && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/users">{copy.userManagement}</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/lessons">{copy.lessonManagement}</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/referrals">{copy.referralDashboard}</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/emails">{copy.emailEditor}</Link>
                        </DropdownMenuItem>
                         <DropdownMenuItem asChild>
                          <Link href="/admin/settings">{copy.dashboardSettings}</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/cron">{copy.cronTestPage}</Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    {user?.role === Role.TEACHER && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard/classes">{copy.manageClasses}</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard/settings">{copy.settings}</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setIsClassNotesDialogOpen(true)}>
                          {copy.sendNotes}
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href="/profile">{copy.profile}</Link>
                    </DropdownMenuItem>
                    {hasAdminAccess && user?.role !== Role.ADMIN && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin">{copy.adminDashboard}</Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onSelect={() => {
                        requestWhatsNewDialog();
                      }}
                    >
                      {copy.whatsNew}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/referrals">{copy.referralDashboard}</Link>
                    </DropdownMenuItem>
                    {user?.role === Role.STUDENT && (
                      <DropdownMenuItem onSelect={() => setIsRateTeacherDialogOpen(true)}>
                        {copy.rateTeacher}
                      </DropdownMenuItem>
                    )}
                    {user?.role !== Role.TEACHER && (
                      <DropdownMenuItem onSelect={() => setIsFeedbackDialogOpen(true)}>
                        {copy.sendFeedback}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <SignOutButton label={copy.signOut} />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <FeedbackDialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen} />
                {user?.role === Role.STUDENT && (
                  <RateTeacherDialog open={isRateTeacherDialogOpen} onOpenChange={setIsRateTeacherDialogOpen} />
                )}
                {user?.role === Role.TEACHER && (
                  <TeacherClassNotesDialog open={isClassNotesDialogOpen} onOpenChange={setIsClassNotesDialogOpen} />
                )}
              </>
            ) : (
              <div className="flex items-center gap-3">
                {isLanding && (
                  <>
                    <Link
                      href="#benefits"
                      className="hidden text-sm font-medium text-slate-300 transition-colors hover:text-white md:inline-flex"
                    >
                      {copy.benefits}
                    </Link>
                    <Link
                      href="#testimonials"
                      className="hidden text-sm font-medium text-slate-300 transition-colors hover:text-white md:inline-flex"
                    >
                      {copy.testimonials}
                    </Link>
                  </>
                )}
                <Button
                  asChild
                  className={cn(
                    isLanding
                      ? "bg-transparent text-slate-100 hover:bg-white/10 border border-slate-800"
                      : "bg-slate-900 text-slate-100 hover:bg-slate-800 border border-slate-800",
                    "hidden md:inline-flex"
                  )}
                  variant={isLanding ? "outline" : "default"}
                >
                  <Link href="/signin">{copy.signIn}</Link>
                </Button>
                <Button
                  asChild
                  className={cn(
                    "font-semibold",
                    isLanding
                      ? "bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 hover:brightness-110 shadow-[0_10px_30px_rgba(45,212,191,0.35)]"
                      : "bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 hover:brightness-110 shadow-[0_10px_30px_rgba(45,212,191,0.35)]"
                  )}
                >
                  <Link href="/register">{copy.startFreeTrial}</Link>
                </Button>
              </div>
            )}
          </div>
        </nav>
      </header>
    </>
  );
}
