// file: scripts/cleanupOrphans.ts
import prisma from '../src/lib/prisma';

async function main() {
  console.log('Starting cleanup...');

  const allAssignments = await prisma.assignment.findMany({
    select: {
      id: true,
      studentId: true,
    },
  });

  const allLessons = await prisma.lesson.findMany({
    select: {
      id: true,
      teacherId: true,
    },
  });

  const userIds = new Set(
    (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id)
  );

  const orphanedAssignmentIds = allAssignments
    .filter((a) => !userIds.has(a.studentId))
    .map((a) => a.id);
    
  const orphanedLessonIds = allLessons
    .filter((l) => !userIds.has(l.teacherId))
    .map((l) => l.id);

  if (orphanedAssignmentIds.length > 0) {
    console.log(`Found ${orphanedAssignmentIds.length} orphaned assignments. Deleting...`);
    const { count } = await prisma.assignment.deleteMany({
      where: {
        id: { in: orphanedAssignmentIds },
      },
    });
    console.log(`Successfully deleted ${count} orphaned assignments.`);
  } else {
    console.log('No orphaned assignments found.');
  }
  
  if (orphanedLessonIds.length > 0) {
    console.log(`Found ${orphanedLessonIds.length} orphaned lessons. Deleting...`);
    const { count } = await prisma.lesson.deleteMany({
      where: {
        id: { in: orphanedLessonIds },
      },
    });
    console.log(`Successfully deleted ${count} orphaned lessons.`);
  } else {
    console.log('No orphaned lessons found.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });