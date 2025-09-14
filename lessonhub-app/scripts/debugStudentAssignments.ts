// file: scripts/debugStudentAssignments.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const studentId = process.argv[2];

  if (!studentId) {
    console.error('❌ Please provide a student ID as a command-line argument.');
    console.log('Usage: npx ts-node scripts/debugStudentAssignments.ts <studentId>');
    process.exit(1);
  }

  console.log(`🔍 Debugging assignments for student: ${studentId}`);

  try {
    // Step 1: Find all assignments for the student
    const assignments = await prisma.assignment.findMany({
      where: { studentId },
    });

    if (assignments.length === 0) {
      console.log('✅ No assignments found for this student in the database. This means either the assignment was never created or the student ID is incorrect.');
      return;
    }

    console.log(`Found ${assignments.length} assignment(s). Checking each one for data integrity...`);
    let hasError = false;

    // Step 2: Check each assignment's lesson and teacher individually
    for (const assignment of assignments) {
      console.log(`\n--- Checking Assignment ID: ${assignment.id} ---`);
      
      const lesson = await prisma.lesson.findUnique({
        where: { id: assignment.lessonId },
      });

      if (!lesson) {
        console.error(`❌ ERROR: Assignment ${assignment.id} is linked to a non-existent Lesson ID: ${assignment.lessonId}`);
        hasError = true;
        continue;
      }

      console.log(`  - Found Lesson ID: ${lesson.id} with Teacher ID: ${lesson.teacherId}`);
      
      const teacher = await prisma.user.findUnique({
        where: { id: lesson.teacherId },
      });

      if (!teacher) {
        console.error(`❌ FATAL ERROR: Lesson ${lesson.id} has a teacherId (${lesson.teacherId}) that points to a user that does NOT exist. This is the source of the "inconsistent query result" error.`);
        hasError = true;
      } else {
        console.log(`  - ✅ Found valid Teacher: ${teacher.email} (ID: ${teacher.id})`);
      }
    }

    if (!hasError) {
        console.log('\n✅ All assignments are linked to valid lessons and teachers. The data integrity is OK.');
    } else {
        console.log('\n🔴 Please review the FATAL ERROR above. You have an orphaned lesson record in your database that needs to be fixed.');
    }

  } catch (error) {
    console.error('An unexpected error occurred during the script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();