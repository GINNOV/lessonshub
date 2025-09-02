// file: src/app/assignments/[assignmentId]/page.tsx

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { getAssignmentById } from "../../actions/lessonActions";
import LessonResponseForm from "@/app/components/LessonResponseForm";
import { marked } from 'marked'; // <-- Import marked

// Corrected type for Next.js 14
interface AssignmentPageProps {
  params: {
    assignmentId: string;
  };
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
  
  // Parse the markdown content to HTML
  const assignmentHtml = marked.parse(lesson.assignment_text);
  const contextHtml = lesson.context_text ? marked.parse(lesson.context_text) : '';


  return (
    <div className="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto">
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

        {/* --- UPDATED TO RENDER MARKDOWN --- */}
        <div dangerouslySetInnerHTML={{ __html: assignmentHtml }} />
        
        {lesson.context_text && (
          <>
            <h3 className="text-lg font-semibold mt-4">Context</h3>
            {/* --- UPDATED TO RENDER MARKDOWN --- */}
            <div dangerouslySetInnerHTML={{ __html: contextHtml }} />
          </>
        )}
      </div>

      <LessonResponseForm assignment={assignment} />
    </div>
  );
}