// file: src/app/profile/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ProfileForm from "@/app/components/ProfileForm";
import prisma from "@/lib/prisma";

export default async function ProfilePage() {
  const session = await auth();

  if (!session) {
    redirect("/signin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    // This case should be rare if the session is valid
    redirect("/signin");
  }

  const serializableUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    timeZone: user.timeZone,
    weeklySummaryOptOut: user.weeklySummaryOptOut,
    gender: user.gender,
    role: user.role,
    lastSeen: user.lastSeen?.toISOString() ?? null,
    isPaying: user.isPaying,
    isSuspended: user.isSuspended,
    isTakingBreak: user.isTakingBreak,
    totalPoints: user.totalPoints,
    defaultLessonPrice: user.defaultLessonPrice?.toNumber() ?? null,
    defaultLessonPreview: user.defaultLessonPreview,
    defaultLessonNotes: user.defaultLessonNotes,
    defaultLessonInstructions: user.defaultLessonInstructions,
    teacherBio: user.teacherBio,
    studentBio: user.studentBio,
    progressCardTitle: user.progressCardTitle,
    progressCardBody: user.progressCardBody,
    progressCardLinkText: user.progressCardLinkText,
    progressCardLinkUrl: user.progressCardLinkUrl,
    assignmentSummaryFooter: user.assignmentSummaryFooter,
  } as any;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
      <ProfileForm userToEdit={serializableUser} />
    </div>
  );
}
