// file: src/app/dashboard/edit/multi-choice/[lessonId]/page.tsx
import { getLessonById } from "@/actions/lessonActions";
import MultiChoiceCreator from "@/app/components/MultiChoiceCreator";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function EditMultiChoicePage({ params }: { params: Promise<{ lessonId: string }> }) {
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

    const serializableLesson = {
      ...lesson,
      price: lesson.price.toNumber(),
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Edit Multi-Choice Lesson</h1>
            <MultiChoiceCreator lesson={serializableLesson} />
        </div>
    );
}