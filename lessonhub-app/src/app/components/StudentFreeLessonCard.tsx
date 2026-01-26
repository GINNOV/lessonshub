'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Play, Loader2 } from 'lucide-react';
import { LessonType } from '@prisma/client';
import { LessonDifficultyIndicator } from '@/app/components/LessonDifficultySelector';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { startFreeLesson } from '@/actions/lessonActions';
import { toast } from 'sonner';

type FreeLesson = {
  id: string;
  title: string;
  type: LessonType;
  lesson_preview: string | null;
  assignment_image_url: string | null;
  price: number;
  difficulty: number;
  teacher: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  completionCount: number;
};

interface StudentFreeLessonCardProps {
  lesson: FreeLesson;
}

const lessonTypeImages: Record<LessonType, string> = {
    [LessonType.STANDARD]: '/my-lessons/standard.png',
    [LessonType.FLASHCARD]: '/my-lessons/flashcard.png',
    [LessonType.MULTI_CHOICE]: '/my-lessons/multiquestions.png',
    [LessonType.LEARNING_SESSION]: '/my-lessons/learning.png',
    [LessonType.NEWS_ARTICLE]: '/my-lessons/standard.png',
    [LessonType.LYRIC]: '/my-lessons/learning.png',
    [LessonType.COMPOSER]: '/my-lessons/composer.png',
    [LessonType.ARKANING]: '/my-lessons/standard.png',
};

export default function StudentFreeLessonCard({ lesson }: StudentFreeLessonCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const result = await startFreeLesson(lesson.id);
      if (result.success && result.assignmentId) {
        toast.success("Lesson started!");
        router.push(`/assignments/${result.assignmentId}`);
      } else {
        toast.error(result.error || "Failed to start lesson.");
        setLoading(false);
      }
    } catch (error) {
      toast.error("Something went wrong.");
      setLoading(false);
    }
  };

  const coverImage = lesson.assignment_image_url?.trim() || lessonTypeImages[lesson.type];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-36 w-full sm:h-40">
        <Image
          src={coverImage}
          alt={lesson.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white">
          <Play className="h-4 w-4" />
          Free Lesson
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-2">
          <div className="flex justify-between items-start">
             <h3 className="text-lg font-semibold text-foreground line-clamp-2">{lesson.title}</h3>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-3">
            {lesson.lesson_preview || "No preview available."}
          </p>
        </div>

        <div className="mt-auto space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {lesson.teacher ? (
                        <div className="flex items-center gap-2" title={lesson.teacher.name || 'Teacher'}>
                             <Avatar className="h-6 w-6">
                                <AvatarImage src={lesson.teacher.image || ''} />
                                <AvatarFallback>{getInitials(lesson.teacher.name)}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground font-medium">{lesson.teacher.name}</span>
                        </div>
                    ) : (
                         <span className="text-xs text-muted-foreground">Unassigned</span>
                    )}
                </div>
            </div>
            
            <LessonDifficultyIndicator value={lesson.difficulty} size="sm" />

            <Button 
                onClick={handleStart} 
                disabled={loading} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting...
                    </>
                ) : (
                    <>
                        Start Lesson
                        <Play className="ml-2 h-4 w-4" />
                    </>
                )}
            </Button>
        </div>
      </div>
    </div>
  );
}
