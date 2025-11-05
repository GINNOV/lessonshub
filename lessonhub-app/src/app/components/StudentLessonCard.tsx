// file: src/app/components/StudentLessonCard.tsx
'use client';

import { useCallback, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AssignmentStatus, LessonType } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn, getWeekAndDay } from '@/lib/utils';
import LocaleDate from '@/app/components/LocaleDate';
import { Button } from '@/components/ui/button';
import { Share2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ensureLessonShareLink } from '@/actions/lessonActions';
import { LessonDifficultyIndicator } from '@/app/components/LessonDifficultySelector';

type SerializableUser = {
  id: string;
  name: string | null;
  image: string | null;
  defaultLessonPrice: number | null;
};

type SerializableLesson = {
  id: string;
  title: string;
  type: LessonType;
  lesson_preview: string | null;
  assignment_image_url: string | null;
  price: number;
  public_share_id: string | null;
  submittedCount: number;
  teacher: SerializableUser | null;
  completionCount: number;
  difficulty: number;
};

type SerializableAssignment = {
  id: string;
  status: AssignmentStatus;
  deadline: Date | string;
  score: number | null;
  pointsAwarded: number;
  answers: any;
  lesson: SerializableLesson;
};

interface StudentLessonCardProps {
  assignment: SerializableAssignment;
  index: number;
}

const lessonTypeImages: Record<LessonType, string> = {
    [LessonType.STANDARD]: '/my-lessons/standard.png',
    [LessonType.FLASHCARD]: '/my-lessons/flashcard.png',
    [LessonType.MULTI_CHOICE]: '/my-lessons/multiquestions.png',
    [LessonType.LEARNING_SESSION]: '/my-lessons/learning.png',
    [LessonType.LYRIC]: '/my-lessons/learning.png',
};

export default function StudentLessonCard({ assignment, index }: StudentLessonCardProps) {
  const { lesson, status, deadline, score, pointsAwarded } = assignment;
  const isPastDeadline = new Date(deadline) < new Date();
  const isComplete = status === AssignmentStatus.COMPLETED || status === AssignmentStatus.GRADED || status === AssignmentStatus.FAILED;
  const [shareId, setShareId] = useState<string | null>(lesson.public_share_id);
  const [isCopying, setIsCopying] = useState(false);
  const pointsEarned = Math.max(pointsAwarded ?? 0, 0);
  
  const getStatusBadge = () => {
    if (status === AssignmentStatus.GRADED) return <Badge variant="default">Graded: {score}/10</Badge>;
    if (status === AssignmentStatus.FAILED) return <Badge variant="destructive">Failed</Badge>;
    if (status === AssignmentStatus.COMPLETED) return <Badge variant="secondary">Submitted</Badge>;
    if (isPastDeadline) return <Badge variant="destructive" className="animate-pulse">Past Due</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>;
  };

  // Always use the curated images under public/my-lessons per type
  const imageSrc = lessonTypeImages[lesson.type];

  const lessonIdDisplay = `Lesson ${getWeekAndDay(new Date(deadline))}`;

  const copyToClipboard = async (text: string) => {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);

    const selection = document.getSelection();
    const originalRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    textarea.select();
    const succeeded = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (originalRange && selection) {
      selection.removeAllRanges();
      selection.addRange(originalRange);
    }

    if (!succeeded) {
      throw new Error('Copy command failed');
    }
  };

  const handleShare = useCallback(async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (isCopying) {
      return;
    }

    setIsCopying(true);
    try {
      let currentShareId = shareId;

      if (!currentShareId) {
        const result = await ensureLessonShareLink(lesson.id);
        if (!result.success || !result.shareId) {
          toast.error(result.error || 'Failed to generate share link.');
          return;
        }
        currentShareId = result.shareId;
        setShareId(currentShareId);
      }

      const origin = window?.location?.origin || '';
      const shareUrl = `${origin}/share/lesson/${currentShareId}`;
      await copyToClipboard(shareUrl);
      toast.success('Lesson link copied to clipboard.');
    } catch (error) {
      console.error('Failed to copy share link', error);
      toast.error('Unable to copy share link.');
    } finally {
      setIsCopying(false);
    }
  }, [shareId, lesson.id, isCopying]);

  return (
    <Card 
        className="h-full flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-in fade-in-0 slide-in-from-bottom-4 group"
        style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
    >
        <CardHeader className="p-0">
            <Link href={`/assignments/${assignment.id}`} className="block relative h-40 w-full overflow-hidden rounded-t-lg">
                <Image 
                    src={imageSrc}
                    alt={lesson.title}
                    fill
                    priority={index < 3}
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
                <div className={cn("absolute top-2 right-2 text-2xl")}>
                    {score !== null && score < 4 && '💩'}
                    {score === 10 && '🏆'}
                </div>
                 <div className="absolute bottom-2 left-2 text-xs text-white/70 font-mono">
                    {lessonIdDisplay}
                </div>
            </Link>
        </CardHeader>
        <CardContent className="flex-grow p-4">
            <div className="flex justify-between items-start mb-2">
                <CardTitle className="text-lg font-bold">
                    <Link href={`/assignments/${assignment.id}`} className="hover:text-primary transition-colors">
                        {lesson.title}
                    </Link>
                </CardTitle>
                {getStatusBadge()}
            </div>
            <p className="text-sm text-gray-500 line-clamp-2">{lesson.lesson_preview}</p>
            <LessonDifficultyIndicator value={lesson.difficulty} size="sm" className="mt-3" />
        </CardContent>
        <CardFooter className="p-4 border-t flex justify-between items-center text-sm">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-gray-600" title={lesson.teacher?.name ? `View ${lesson.teacher.name}'s profile` : 'Unassigned'}>
                    {lesson.teacher ? (
                      <Link href={`/teachers#${lesson.teacher.id}`} className="inline-flex" prefetch={false}>
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={lesson.teacher.image || ''} alt={lesson.teacher.name || 'teacher'} />
                            <AvatarFallback>{getInitials(lesson.teacher.name)}</AvatarFallback>
                        </Avatar>
                      </Link>
                    ) : (
                      <Avatar className="h-6 w-6">
                          <AvatarImage src="" alt="Unassigned teacher" />
                          <AvatarFallback>?</AvatarFallback>
                      </Avatar>
                    )}
                </div>
                 <div className="flex items-center gap-1 text-gray-500" title={`${lesson.submittedCount} of ${lesson.completionCount} students have submitted`}>
                    <Users className="h-4 w-4" />
                    <span>{`${lesson.submittedCount} of ${lesson.completionCount}`}</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {status === AssignmentStatus.GRADED ? (
                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
                    +{pointsEarned} pts
                  </Badge>
                ) : (
                  <span className="text-xs text-gray-400">Points pending</span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleShare}
                  disabled={isCopying}
                  className="h-8 w-8"
                  aria-label="Copy lesson share link"
                  title="Copy lesson share link"
                >
                  <Share2 className={cn("h-4 w-4", isCopying && "animate-pulse")} />
                </Button>
                <div className={cn("font-semibold", isPastDeadline && !isComplete ? "text-red-500" : "text-gray-600")}>
                    {isComplete ? (
                        <Button asChild variant="secondary" size="sm">
                            <Link href={`/assignments/${assignment.id}`}>View Results</Link>
                        </Button>
                    ) : (
                        <LocaleDate date={deadline} />
                    )}
                </div>
            </div>
        </CardFooter>
    </Card>
  );
}
