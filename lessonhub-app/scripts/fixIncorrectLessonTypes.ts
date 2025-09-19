// file: scripts/fixIncorrectLessonTypes.ts
import prisma from '../src/lib/prisma';
import { LessonType } from '@prisma/client';

async function main() {
  console.log('🔍 Starting script to find and fix incorrectly typed flashcard lessons...');

  // Find lessons that are typed as MULTI_CHOICE but have flashcards.
  // This is a clear indicator of a lesson that was saved incorrectly.
  const incorrectlyTypedLessons = await prisma.lesson.findMany({
    where: {
      type: LessonType.MULTI_CHOICE,
      flashcards: {
        some: {}, // This checks for the existence of at least one related flashcard.
      },
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (incorrectlyTypedLessons.length === 0) {
    console.log('✅ No incorrectly typed lessons found. Your database is in good shape!');
    return;
  }

  console.log(`Found ${incorrectlyTypedLessons.length} lesson(s) to correct.`);

  for (const lesson of incorrectlyTypedLessons) {
    try {
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { type: LessonType.FLASHCARD },
      });
      console.log(`- ✅ Corrected lesson: "${lesson.title}" (ID: ${lesson.id})`);
    } catch (error) {
      console.error(`- ❌ Failed to correct lesson: "${lesson.title}" (ID: ${lesson.id})`, error);
    }
  }

  console.log('✨ Correction script finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
