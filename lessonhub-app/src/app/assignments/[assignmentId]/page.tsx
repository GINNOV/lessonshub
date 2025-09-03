import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getAssignmentById } from "@/actions/lessonActions";
import LessonResponseForm from "@/app/components/LessonResponseForm";
import { marked } from 'marked';
import { AssignmentStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

// Corrected type for Next.js 14
interface AssignmentPageProps {
  params: {
    assignmentId: string;
  };
}

// --- NEW SVG Icons for the banner ---
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


const getGradeBackground = (score: number | null) => {
  if (score === null) return 'bg-gray-100';
  if (score === 10) return 'bg-gradient-to-br from-green-100 to-green-200';
  if (score === 2) return 'bg-gradient-to-br from-amber-100 to-amber-200';
  if (score === -1) return 'bg-gradient-to-br from-red-100 to-red-200';
  return 'bg-gradient-to-br from-yellow-100 to-yellow-200';
};


export default async function AssignmentPage({ params }: AssignmentPageProps) {
  const session = await auth();
  if (!session) {
    redirect("/signin");
  }

  const { assignmentId } = params;
  const assignment = await getAssignmentById(assignmentId, session.user.id);

  if (!assignment) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold">Assignment not found</h1>
        <p>This assignment may not exist or you may not have permission to view it.</p>
      </div>
    );
  }

  const { lesson } = assignment;
  
  const assignmentHtml = (await marked.parse(lesson.assignment_text)) as string;
  const contextHtml = lesson.context_text ? (await marked.parse(lesson.context_text)) as string : '';
  const isPastDeadline = new Date() > new Date(assignment.deadline);


  return (
    <div className="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto">
      
      {/* --- Graded Banner --- */}
      {assignment.status === AssignmentStatus.GRADED && (
        <div className={cn("border-l-4 p-4 rounded-md mb-6", getGradeBackground(assignment.score))}>
          <div className="flex items-start">
            <CheckCircleIcon className="h-6 w-6 mr-3 mt-1 flex-shrink-0" />
            <div>
              <p className="font-bold text-lg">Lesson Graded</p>
              <div className="mt-2 flex items-baseline gap-4">
                <p className="text-3xl font-bold">Score: {assignment.score}</p>
              </div>
              {assignment.teacherComments && (
                 <blockquote className="mt-2 pl-4 border-l-4 border-gray-400/50 italic">
                   &quot;{assignment.teacherComments}&quot;
                 </blockquote>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- Past Deadline Banner --- */}
      {isPastDeadline && assignment.status === AssignmentStatus.PENDING && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 flex items-center">
          <AlertTriangleIcon className="h-6 w-6 mr-3" />
          <div>
            <p className="font-bold">Deadline Passed</p>
            <p className="text-sm">This assignment is past its deadline. You can still view the content, but you are not able to submit a response.</p>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-2">{lesson.title}</h1>
      <p className="text-sm text-gray-500 mb-6">
        Deadline: {new Date(assignment.deadline).toLocaleString()}
      </p>

      {lesson.lesson_preview && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <h3 className="text-lg font-semibold flex items-center"><InfoIcon className="h-5 w-5 mr-2" /> Lesson Preview</h3>
          <p className="text-gray-700 mt-2">{lesson.lesson_preview}</p>
        </div>
      )}

      <div className="prose max-w-none">
        <h2 className="text-xl font-semibold">Instructions</h2>

        {lesson.assignment_image_url && (
          <div className="my-4">
            <Image
              src={lesson.assignment_image_url}
              alt={`Image for ${lesson.title}`}
              width={600}
              height={400}
              className="w-full h-auto rounded-lg object-contain"
            />
          </div>
        )}

        <div dangerouslySetInnerHTML={{ __html: assignmentHtml }} />
        
        {lesson.context_text && (
          <>
            <h3 className="text-lg font-semibold mt-4">Additional Information</h3>
            <div dangerouslySetInnerHTML={{ __html: contextHtml }} />
          </>
        )}

        {lesson.attachment_url && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold flex items-center"><PaperclipIcon className="h-5 w-5 mr-2" /> Attachment</h3>
            <Link href={lesson.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {lesson.attachment_url}
            </Link>
          </div>
        )}
      </div>

      <LessonResponseForm assignment={assignment} />
    </div>
  );
}