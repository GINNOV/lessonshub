// file: lessonhub-app/src/app/dashboard/edit/flashcard/[lessonId]/page.tsx

import { getLessonById } from "@/actions/lessonActions";
import FlashcardCreator from "@/app/components/FlashcardCreator";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getTeacherPreferences } from "@/actions/teacherActions";
import { getInstructionBookletsForTeacher } from "@/actions/instructionBookletActions";

export default async function EditFlashcardPage({ params }: { params: Promise<{ lessonId: string }> }) {
    const { lessonId } = await params;
    const lesson = await getLessonById(lessonId);

    if (!lesson) {
        return (
            <div className="text-center">
                 <h1 className="text-2xl font-bold">Lesson Not Found</h1>
                 <p>The lesson you are trying to edit could not be found.</p>
                 <Button asChild className="mt-4">
                     <Link href="/dashboard">Return to Dashboard</Link>
                 </Button>
            </div>
        )
    }
    const [preferences, instructionBooklets] = await Promise.all([
      getTeacherPreferences(),
      getInstructionBookletsForTeacher(),
    ]);

    const serializablePreferences = preferences ? {
      ...preferences,
      defaultLessonPrice: preferences.defaultLessonPrice?.toNumber() ?? 0,
    } : null;
    
    const serializableBooklets = instructionBooklets.map((booklet) => ({
      ...booklet,
      createdAt: booklet.createdAt.toISOString(),
      updatedAt: booklet.updatedAt.toISOString(),
    }));

    const serializableLesson = {
      ...lesson,
      price: lesson.price.toNumber(),
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Edit Flashcard Lesson</h1>
            <FlashcardCreator
              lesson={serializableLesson}
              teacherPreferences={serializablePreferences}
              instructionBooklets={serializableBooklets}
            />
        </div>
    );
}
