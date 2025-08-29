// file: src/app/assignments/[assignmentId]/page.tsx

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getAssignmentById } from "@/app/actions/lessonActions";
import LessonResponseForm from "@/app/components/LessonResponseForm";

export default async function AssignmentPage({ params }: { params: { assignmentId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/signin");
  }

  const assignment = await getAssignmentById(params.assignmentId, session.user.id);

  if (!assignment) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold">Assignment not found</h1>
        <p>This assignment may not exist or you may not have permission to view it.</p>
      </div>
    );
  }

  const { lesson } = assignment;

  return (
    <div className="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{lesson.title}</h1>
      <p className="text-sm text-gray-500 mb-6">
        Deadline: {new Date(assignment.deadline).toLocaleString()}
      </p>

      <div className="prose max-w-none">
        <h2 className="text-xl font-semibold">Assignment</h2>

        {/* Display the uploaded image if it exists */}
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

        <p>{lesson.assignment_text}</p>

        {lesson.context_text && (
          <>
            <h3 className="text-lg font-semibold mt-4">Context</h3>
            <p>{lesson.context_text}</p>
          </>
        )}
      </div>

      <LessonResponseForm assignment={assignment} />
    </div>
  );
}