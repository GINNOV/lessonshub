// file: src/app/dashboard/settings/page.tsx

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import TeacherPreferences from "@/app/components/TeacherPreferences";
import WhatsNewDialog from "@/app/components/WhatsNewDialog";
import { Button } from "@/components/ui/button";
import { loadLatestUpgradeNote } from "@/lib/whatsNew";
import { headers } from "next/headers";
import { parseAcceptLanguage, resolveLocale, UiLanguagePreference } from "@/lib/locale";

export default async function TeacherSettingsPage() {
  const session = await auth();

  if (!session) {
    redirect("/signin");
  }

  if (session.user.role !== Role.TEACHER) {
    redirect("/dashboard");
  }

  const headerList = await headers();
  const detectedLocales = parseAcceptLanguage(headerList.get("accept-language"));
  const preference = ((session.user as any)?.uiLanguage as UiLanguagePreference) ?? "device";
  const locale = resolveLocale({
    preference,
    detectedLocales,
    supportedLocales: ["en", "it"] as const,
    fallback: "en",
  });

  const [teacher, instructionBooklets, whatsNewUS, whatsNewIT] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
    }),
    prisma.instructionBooklet.findMany({
      where: { teacherId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        body: true,
      },
    }),
    loadLatestUpgradeNote('us'),
    loadLatestUpgradeNote('it'),
  ]);

  if (!teacher) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">Lesson Defaults</h1>
        <p className="text-red-600">Unable to load your preferences. Please try again later.</p>
      </div>
    );
  }

const serializableTeacher = {
  ...teacher,
  defaultLessonPrice: teacher.defaultLessonPrice
    ? Number(teacher.defaultLessonPrice.toString())
    : null,
  referralRewardPercent: teacher.referralRewardPercent
    ? Number(teacher.referralRewardPercent.toString())
    : null,
  referralRewardMonthlyAmount: teacher.referralRewardMonthlyAmount
    ? Number(teacher.referralRewardMonthlyAmount.toString())
    : null,
};

  const whatsNewNotes = {
    us: whatsNewUS,
    it: whatsNewIT,
  };

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <WhatsNewDialog notes={whatsNewNotes} defaultLocale={locale === "it" ? "it" : "us"} />
      <div>
        <h1 className="text-3xl font-bold">Lesson Defaults</h1>
        <p className="mt-1 text-slate-400">
          Set the values that pre-fill when you create new lessons across every lesson type.
        </p>
      </div>
      <TeacherPreferences teacher={serializableTeacher as any} instructionBooklets={instructionBooklets} />
      <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
        <h2 className="text-2xl font-semibold">Instruction Booklets</h2>
        <p className="mt-2 text-slate-400">
          Create reusable instruction sets once and drop them into any lesson. Manage them without
          opening the lesson creator.
        </p>
        <div className="mt-4">
          <Button asChild>
            <Link href="/dashboard/instructions">Open Instruction Booklets</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
