// file: src/app/components/LessonContentView.tsx
import Image from "next/image";
import Link from "next/link";
import { marked } from "marked";
import { Lesson } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Paperclip, Eye, Volume2, ExternalLink } from "lucide-react";
marked.setOptions({
  gfm: true,
  breaks: true,
});

type LessonWithOptionalLyric = Omit<Lesson, 'price'> & {
  price: number;
  lyricConfig?: {
    audioUrl: string;
    timingSourceUrl?: string | null;
    lrcUrl?: string | null;
  } | null;
};

interface LessonContentViewProps {
  lesson: LessonWithOptionalLyric; // Expects a serialized lesson
  showInstructions?: boolean;
}

export default async function LessonContentView({ lesson, showInstructions = true }: LessonContentViewProps) {
  const assignmentHtml = lesson.assignment_text ? ((await marked.parse(lesson.assignment_text)) as string) : "";
  const contextHtml = lesson.context_text ? ((await marked.parse(lesson.context_text)) as string) : "";

  const audioUrl = lesson.soundcloud_url || lesson.lyricConfig?.audioUrl || "";
  const isSpotifyAudio = typeof audioUrl === 'string' && /open\.spotify\.com/i.test(audioUrl);
  const isSpotifyMaterialLink = typeof lesson.attachment_url === 'string' && /open\.spotify\.com/i.test(lesson.attachment_url);

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
    <div className="prose prose-sm max-w-none text-slate-200">
      {lesson.assignment_image_url && (
        <div className="my-4">
          <h2 className="text-sm font-semibold uppercase text-slate-300">
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
          {isSpotifyAudio ? (
            <Button asChild variant="outline" className="border-slate-800 bg-slate-900/70 text-slate-100 hover:border-teal-400/60 hover:text-white">
              <Link href={audioUrl} target="_blank" rel="noopener noreferrer">
                <Volume2 className="mr-2 h-4 w-4" /> Listen on Spotify <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          ) : isYouTubeUrl(audioUrl) ? (
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
          ) : /soundcloud/i.test(audioUrl) ? (
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
          ) : (
            <audio
              className="w-full"
              controls
              preload="metadata"
              src={audioUrl}
            />
          )}
          {lesson.lyricConfig?.timingSourceUrl && (
            <div className="mt-2 text-sm text-slate-300">
              Timing reference:{' '}
              <a
                href={lesson.lyricConfig.timingSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-teal-200 underline"
              >
                open track
              </a>
            </div>
          )}
        </div>
      )}

      {showInstructions && (
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-md">
          <h2 className="text-xl font-semibold text-slate-100">👉🏼 INSTRUCTIONS</h2>
          <div className="prose prose-sm max-w-none text-slate-200" dangerouslySetInnerHTML={{ __html: assignmentHtml }} />
        </div>
      )}

      {contextHtml && (
        <div className="mt-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 shadow-md">
          <Accordion type="single" collapsible>
            <AccordionItem value="additional-info" className="border-none">
              <AccordionTrigger className="group py-0 text-left text-lg font-semibold text-slate-100 hover:no-underline">
                <span className="flex flex-col gap-1">
                  <span>Additional Information</span>
                  <span className="text-xs font-normal text-slate-400 group-data-[state=open]:hidden">
                    Additional information available.
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-3">
                <div
                  className="prose prose-sm max-w-none text-slate-200"
                  dangerouslySetInnerHTML={{ __html: contextHtml }}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      {lesson.attachment_url && (
        <div className="mt-6">
          <h3 className="mb-2 flex items-center text-lg font-semibold text-slate-100">
            <Paperclip className="h-5 w-5 mr-2" /> MATERIAL
          </h3>
          <Button
            asChild
            variant="outline"
            className="border border-teal-300/50 bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 shadow-[0_12px_35px_rgba(45,212,191,0.35)] hover:brightness-110"
          >
            <Link href={lesson.attachment_url} target="_blank" rel="noopener noreferrer">
              {isSpotifyMaterialLink ? (
                <>
                  <Volume2 className="mr-2 h-4 w-4" /> Listen on Spotify
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" /> View Attachment
                </>
              )}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
