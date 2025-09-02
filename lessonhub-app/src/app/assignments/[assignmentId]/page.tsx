// file: src/app/assignments/[assignmentId]/page.tsx

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { getAssignmentById } from "@/actions/lessonActions";
import LessonResponseForm from "@/app/components/LessonResponseForm";
import { marked } from 'marked';

// Corrected type for Next.js 14
interface AssignmentPageProps {
  params: {
    assignmentId: string;
  };
}

// --- NEW SVG Icon for the banner ---
function AlertTriangleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

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
  
  const assignmentHtml = marked.parse(lesson.assignment_text);
  const contextHtml = lesson.context_text ? marked.parse(lesson.context_text) : '';
  const isPastDeadline = new Date() > new Date(assignment.deadline);


  return (
    <div className="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto">
      
      {/* --- NEW: Past Deadline Banner --- */}
      {isPastDeadline && (
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
      
      <div className="prose max-w-none">
        <h2 className="text-xl font-semibold">Assignment</h2>

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
            <h3 className="text-lg font-semibold mt-4">Context</h3>
            <div dangerouslySetInnerHTML={{ __html: contextHtml }} />
          </>
        )}
      </div>

      <LessonResponseForm assignment={assignment} />
    </div>
  );
}