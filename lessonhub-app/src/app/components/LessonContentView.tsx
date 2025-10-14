// file: src/app/components/LessonContentView.tsx
import Image from "next/image";
import Link from "next/link";
import { marked } from "marked";
import { Lesson } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Paperclip, Eye } from "lucide-react";

interface LessonContentViewProps {
  lesson: Omit<Lesson, 'price'> & { price: number }; // Expects a serialized lesson
}

export default async function LessonContentView({ lesson }: LessonContentViewProps) {
  const assignmentHtml = lesson.assignment_text ? ((await marked.parse(lesson.assignment_text)) as string) : "";
  const contextHtml = lesson.context_text ? ((await marked.parse(lesson.context_text)) as string) : "";

  const audioUrl = lesson.soundcloud_url || "";

  const isYouTubeUrl = (url: string) => /(?:youtube\.com|youtu\.be)\//i.test(url);
  const getYouTubeId = (url: string): string | null => {
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtu.be")) {
        return u.pathname.replace("/", "");
      }
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const path = u.pathname;
      const parts = path.split("/").filter(Boolean);
      if (parts[0] === "embed" || parts[0] === "shorts") return parts[1] || null;
      return null;
    } catch {
      return null;
    }
  };
  const parseYtTime = (t: string): number => {
    if (!t) return 0;
    // Supports formats like 90, 1m30s, 2h3m4s
    if (/^\d+$/.test(t)) return parseInt(t, 10);
    const re = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i;
    const m = t.match(re);
    if (!m) return 0;
    const h = parseInt(m[1] || '0', 10);
    const mns = parseInt(m[2] || '0', 10);
    const s = parseInt(m[3] || '0', 10);
    return h * 3600 + mns * 60 + s;
  };
  const getYtStartSeconds = (url: string): number => {
    try {
      const u = new URL(url);
      const start = u.searchParams.get('start');
      const t = u.searchParams.get('t');
      if (start && /^\d+$/.test(start)) return parseInt(start, 10);
      if (t) return parseYtTime(t);
      return 0;
    } catch {
      return 0;
    }
  };

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

      {audioUrl && (
        <div className="my-4">
          {isYouTubeUrl(audioUrl) ? (
            (() => {
              const vid = getYouTubeId(audioUrl);
              if (!vid) return null as any;
              const start = getYtStartSeconds(audioUrl);
              const ytSrc = `https://www.youtube.com/embed/${vid}?rel=0${start ? `&start=${start}` : ''}`;
              return (
                <iframe
                  title={`YouTube player for ${lesson.title}`}
                  width="100%"
                  height="240"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  frameBorder="0"
                  src={ytSrc}
                />
              );
            })()
          ) : (
            <iframe
              title={`SoundCloud player for ${lesson.title}`}
              width="100%"
              height="166"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              scrolling="no"
              frameBorder="0"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(audioUrl)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=false`}
            />
          )}
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
