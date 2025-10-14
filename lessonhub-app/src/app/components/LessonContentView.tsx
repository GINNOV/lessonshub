// file: src/app/components/LessonContentView.tsx
import Image from "next/image";
import Link from "next/link";
import { marked } from "marked";
import { Lesson, LessonType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Paperclip, Eye } from "lucide-react";

interface LessonContentViewProps {
  lesson: Omit<Lesson, 'price'> & { price: number }; // Expects a serialized lesson
}

export default async function LessonContentView({ lesson }: LessonContentViewProps) {
  const assignmentHtml = lesson.assignment_text ? ((await marked.parse(lesson.assignment_text)) as string) : "";
  const contextHtml = lesson.context_text ? ((await marked.parse(lesson.context_text)) as string) : "";

  return (
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
            src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(lesson.soundcloud_url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`}
          ></iframe>
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

      {lesson.attachment_url && (
        <div className="mt-6">
          <h3 className="mb-2 flex items-center text-lg font-semibold">
            <Paperclip className="h-5 w-5 mr-2" /> MATERIAL
          </h3>
          <Button asChild variant="outline">
            <Link href={lesson.attachment_url} target="_blank" rel="noopener noreferrer">
              <Eye className="mr-2 h-4 w-4" /> View Attachment
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
