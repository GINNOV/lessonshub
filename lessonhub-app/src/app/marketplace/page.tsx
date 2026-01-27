import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { AssignmentStatus, PointReason, Role } from '@prisma/client';
import { getAssignmentsForStudent, getStudentStats } from '@/actions/lessonActions';
import MarketplaceShelf from '@/app/components/MarketplaceShelf';
import { headers } from 'next/headers';
import { parseAcceptLanguage, resolveLocale } from '@/lib/locale';
import type { UiLanguagePreference } from '@/lib/locale';

export default async function MarketplacePage() {
  const session = await auth();

  if (!session) {
    redirect('/signin');
  }

  if (session.user.role !== Role.STUDENT) {
    redirect('/dashboard');
  }

  const requestHeaders = await headers();
  const detectedLocales = parseAcceptLanguage(requestHeaders.get('accept-language'));
  const preference = ((session.user as any)?.uiLanguage ?? 'device') as UiLanguagePreference;
  const locale = resolveLocale({
    preference,
    detectedLocales,
    supportedLocales: ['en', 'it'] as const,
    fallback: 'en',
  }) as 'en' | 'it';

  const [assignments, stats] = await Promise.all([
    getAssignmentsForStudent(session.user.id),
    getStudentStats(session.user.id),
  ]);

  const now = new Date();
  const marketplaceCandidates = assignments.filter((assignment) => {
    if (assignment.status === AssignmentStatus.FAILED) return true;
    if (assignment.status === AssignmentStatus.PENDING && new Date(assignment.deadline) <= now) return true;
    return false;
  });

  const candidateIds = marketplaceCandidates.map((assignment) => assignment.id);
  const purchases = candidateIds.length
    ? await prisma.pointTransaction.findMany({
        where: {
          userId: session.user.id,
          reason: PointReason.MARKETPLACE_PURCHASE,
          assignmentId: { in: candidateIds },
        },
        select: { assignmentId: true },
      })
    : [];
  const purchasedIds = new Set(
    purchases.map((purchase) => purchase.assignmentId).filter((id): id is string => Boolean(id)),
  );

  const lessons = marketplaceCandidates
    .filter((assignment) => !purchasedIds.has(assignment.id))
    .map((assignment) => {
      const { lesson } = assignment;
      return {
        assignmentId: assignment.id,
        status: assignment.status,
        deadline: assignment.deadline,
        lesson: {
          id: lesson.id,
          title: lesson.title,
          type: lesson.type,
          lesson_preview: lesson.lesson_preview,
          assignment_image_url: lesson.assignment_image_url,
          price: lesson.price.toNumber(),
          difficulty: lesson.difficulty,
          teacher: lesson.teacher
            ? {
                id: lesson.teacher.id,
                name: lesson.teacher.name,
                image: lesson.teacher.image,
              }
            : null,
        },
      };
    });

  const availableSavings = Math.max(0, stats.totalValue ?? 0);

  return (
    <MarketplaceShelf
      lessons={lessons}
      availableSavings={availableSavings}
      locale={locale}
    />
  );
}
