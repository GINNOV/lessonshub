// file: scripts/assignOrphansToAllTeachers.ts
import prisma from '../src/lib/prisma';
import { Role } from '@prisma/client';

async function main() {
  console.log('🔍 Starting script to find and assign orphan students...');

  try {
    // 1. Find all teachers
    const allTeachers = await prisma.user.findMany({
      where: { role: Role.TEACHER },
      select: { id: true },
    });

    if (allTeachers.length === 0) {
      console.log('⚠️ No teachers found in the database. Exiting script.');
      return;
    }
    console.log(`🏫 Found ${allTeachers.length} teacher(s).`);

    // 2. Find all students and their current teacher assignments
    const allStudents = await prisma.user.findMany({
        where: { role: Role.STUDENT },
        select: { id: true, teachers: { select: { teacherId: true } } },
    });

    // 3. Filter to find students with no teacher assignments
    const orphanStudents = allStudents.filter(student => student.teachers.length === 0);

    if (orphanStudents.length === 0) {
      console.log('✅ All students are already assigned to at least one teacher. No action needed.');
      return;
    }

    console.log(`🧑‍🎓 Found ${orphanStudents.length} student(s) with no teacher assignments. Assigning them to all teachers now...`);

    // 4. Prepare the new assignment records
    const newAssignments: { studentId: string; teacherId: string }[] = [];
    for (const student of orphanStudents) {
      for (const teacher of allTeachers) {
        newAssignments.push({
          studentId: student.id,
          teacherId: teacher.id,
        });
      }
    }

    // 5. Create the new records in the database
    const result = await prisma.teachersForStudent.createMany({
      data: newAssignments,
      skipDuplicates: true, // A safeguard, though our logic already filters for unassigned students
    });

    console.log(`✅ Successfully created ${result.count} new student-teacher assignments.`);
    console.log('🎉 Cleanup complete. All students are now assigned.');

  } catch (error) {
    console.error('❌ An error occurred during the script:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
