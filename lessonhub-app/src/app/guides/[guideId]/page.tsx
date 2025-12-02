import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getHubGuideById } from "@/actions/lessonActions";
import LearningSessionPlayer from "@/app/components/LearningSessionPlayer";
import GuideCompletionCTA from "@/app/components/GuideCompletionCTA";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { marked } from "marked";
import Image from "next/image";
import prisma from "@/lib/prisma";

export default async function GuidePage({ params }: { params: Promise<{ guideId: string }> }) {
  const session = await auth();
  if (!session) {
    redirect("/signin");
  } else if (session.user.role !== Role.STUDENT) {
    redirect("/dashboard");
  }

  const { guideId } = await params;
  const guide = await getHubGuideById(guideId);
  if (!guide) {
    notFound();
  }

  const studentRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPaying: true },
  });

  const isPaying = studentRecord?.isPaying ?? session.user.isPaying ?? false;
  const isFreeGuide = guide.guideIsFreeForAll === true;

  if (!isPaying && !isFreeGuide) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Button asChild variant="ghost">
          <Link href="/my-lessons">← Back to dashboard</Link>
        </Button>
        <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-bold">Unlock Hub Guides</h1>
          <p className="mt-3 text-gray-600">
            Hub Guides are part of the paid membership. Upgrade your plan to explore interactive guides anytime.
          </p>
          <Button asChild className="mt-6">
            <Link href="/profile">Manage subscription</Link>
          </Button>
        </div>
      </div>
    );
  }

  const completionPromise = prisma.guideCompletion.findUnique({
    where: {
      studentId_guideId: {
        studentId: session.user.id,
        guideId,
      },
    },
  });

  const [completion] = await Promise.all([completionPromise]);

  const previewHtml = guide.lessonPreview ? await marked.parse(guide.lessonPreview) : null;
  const instructionsHtml = guide.assignmentText ? await marked.parse(guide.assignmentText) : null;
  const updatedLabel = new Date(guide.updatedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div className="flex items-center justify-between">
        <Button
          asChild
          variant="ghost"
          className="border-slate-700 bg-slate-900/70 text-slate-100 hover:border-teal-400/60 hover:text-white"
        >
          <Link href="/my-lessons">← Back to dashboard</Link>
        </Button>
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-200">Hub Guide</p>
      </div>

      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-slate-100">{guide.title}</h1>
        <p className="text-sm text-slate-400">Updated {updatedLabel}</p>
      </div>

      {guide.guideCardImage && (
        <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-slate-800 shadow-xl">
          <Image
            src={guide.guideCardImage}
            alt={`${guide.title} card`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>
      )}

      {previewHtml && (
        <div
          className="prose prose-sm max-w-none rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-slate-200 shadow-xl"
          dangerouslySetInnerHTML={{ __html: previewHtml as string }}
        />
      )}

      {instructionsHtml && (
        <div
          className="prose prose-sm max-w-none rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-slate-200 shadow-xl"
          dangerouslySetInnerHTML={{ __html: instructionsHtml as string }}
        />
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl">
        <LearningSessionPlayer cards={guide.learningSessionCards} lessonTitle={guide.title} />
      </div>

      <GuideCompletionCTA guideId={guide.id} defaultCompleted={Boolean(completion)} pointsPerGuide={3} />
    </div>
  );
}
