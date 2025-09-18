// file: src/app/assignments/[assignmentId]/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getAssignmentById } from "@/actions/lessonActions";
import LessonResponseForm from "@/app/components/LessonResponseForm";
import MultiChoicePlayer from "@/app/components/MultiChoicePlayer";
import FlashcardPlayer from "@/app/components/FlashcardPlayer";
import { marked } from "marked";
import { AssignmentStatus, LessonType } from "@prisma/client";
import Confetti from "@/app/components/Confetti";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import LocaleDate from "@/app/components/LocaleDate";

// --- SVG Icons ---
function AlertTriangleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
function PaperclipIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.59a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const getGradeBackground = (score: number | null) => {
  if (score === null) return "bg-gray-100";
  if (score === 10) return "bg-gradient-to-br from-green-100 to-green-200";
  if (score === 2) return "bg-gradient-to-br from-amber-100 to-amber-200";
  if (score === -1) return "bg-gradient-to-br from-red-100 to-red-200";
  return "bg-gradient-to-br from-yellow-100 to-yellow-200";
};

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const session = await auth();
  if (!session) {
    redirect("/signin");
  }

  const { assignmentId } = await params;
  const assignment = await getAssignmentById(assignmentId, session.user.id);

  if (!assignment) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold">Assignment not found</h1>
        <p>This assignment may not exist or you may not have permission to view it.</p>
      </div>
    );
  }
  
  const serializableAssignment = {
    ...assignment,
    lesson: {
      ...assignment.lesson,
      price: assignment.lesson.price.toNumber(),
    },
  };

  const { lesson } = serializableAssignment;

  const assignmentHtml = (await marked.parse(lesson.assignment_text ?? "")) as string;
  const contextHtml = lesson.context_text ? ((await marked.parse(lesson.context_text)) as string) : "";
  const isPastDeadline = new Date() > new Date(serializableAssignment.deadline);

  const isMultiChoice = lesson.type === LessonType.MULTI_CHOICE;
  const isFlashcard = lesson.type === LessonType.FLASHCARD;
  const showConfetti = serializableAssignment.score === 10;
  
  return (
    <div className="mx-auto max-w-4xl rounded-lg bg-white p-8 shadow-md">
      {showConfetti && <Confetti />}

      <h1 className="mb-2 text-3xl font-bold">{lesson.title}</h1>
      <p className="mb-6 text-sm font-bold text-red-600">
        Deadline: <LocaleDate date={serializableAssignment.deadline} />
      </p>

      {lesson.lesson_preview && (
        <div className="mb-6 rounded-lg border bg-gray-50 p-4">
          <h3 className="flex items-center text-lg font-semibold">
            <InfoIcon className="h-5 w-5 mr-2" /> Lesson Preview
          </h3>
          <p className="mt-2 text-gray-700">{lesson.lesson_preview}</p>
        </div>
      )}

      <div className="prose max-w-none">
        {lesson.assignment_image_url && (
          <div className="my-4">
            <h2 className="text-sm font-semibold uppercase text-gray-500">
              Supporting Material
            </h2>
            <Image
              src={lesson.assignment_image_url}
              alt={`Image for ${lesson.title}`}
              width={600}
              height={400}
              className="mt-2 h-auto w-full rounded-lg border object-contain"
            />
          </div>
        )}

        {lesson.soundcloud_url && (
            <div className="my-4">
                <iframe 
                    width="100%" 
                    height="166" 
                    scrolling="no" 
                    frameBorder="no" 
                    allow="autoplay" 
                    src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(lesson.soundcloud_url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`}>
                </iframe>
            </div>
        )}

        <div className="mb-6 rounded-lg border bg-gray-50 p-4">
            <h2 className="text-xl font-semibold">👉🏼 INSTRUCTIONS</h2>
            <div dangerouslySetInnerHTML={{ __html: assignmentHtml }} />
        </div>

        {contextHtml && (
          <>
            <h3 className="mt-4 text-lg font-semibold">Additional Information</h3>
            <div dangerouslySetInnerHTML={{ __html: contextHtml }} />
          </>
        )}

        {lesson.notes && (
          <div className="mt-6 border-l-4 border-yellow-400 bg-yellow-50 p-4">
            <h3 className="text-lg font-semibold text-yellow-800">
              Teacher&apos;s Note
            </h3>
            <p className="mt-1 text-yellow-900">{lesson.notes}</p>
          </div>
        )}

        {lesson.attachment_url && (
          <div className="mt-6">
            <h3 className="mb-2 flex items-center text-lg font-semibold">
              <PaperclipIcon className="h-5 w-5 mr-2" /> MATERIAL
            </h3>
            <Button asChild variant="outline">
              <Link href={lesson.attachment_url} target="_blank" rel="noopener noreferrer">
                <EyeIcon className="mr-2 h-4 w-4" /> View Attachment
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="mt-8 border-t border-gray-200 pt-6">
        <h2 className="mb-4 text-2xl font-bold text-gray-800">Your Response</h2>
        {isFlashcard ? (
          <FlashcardPlayer assignment={serializableAssignment} />
        ) : isMultiChoice ? (
          <MultiChoicePlayer assignment={serializableAssignment} />
        ) : (
          <LessonResponseForm assignment={serializableAssignment} />
        )}
      </div>
    </div>
  );
}