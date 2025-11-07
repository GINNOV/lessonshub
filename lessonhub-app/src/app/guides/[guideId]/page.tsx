import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getHubGuideById } from "@/actions/lessonActions";
import LearningSessionPlayer from "@/app/components/LearningSessionPlayer";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { marked } from "marked";

export default async function GuidePage({ params }: { params: Promise<{ guideId: string }> }) {
  const session = await auth();
  if (!session) {
    redirect("/signin");
  } else if (session.user.role !== Role.STUDENT) {
    redirect("/dashboard");
  }

  const { guideId } = await params;

  if (!session.user.isPaying) {
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

  const guide = await getHubGuideById(guideId);
  if (!guide) {
    notFound();
  }

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
        <Button asChild variant="ghost">
          <Link href="/my-lessons">← Back to dashboard</Link>
        </Button>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Hub Guide</p>
      </div>

      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-gray-900">{guide.title}</h1>
        <p className="text-sm text-gray-500">Updated {updatedLabel}</p>
      </div>

      {previewHtml && (
        <div
          className="prose prose-slate max-w-none rounded-2xl border bg-white p-6 shadow-sm"
          dangerouslySetInnerHTML={{ __html: previewHtml as string }}
        />
      )}

      {instructionsHtml && (
        <div
          className="prose prose-slate max-w-none rounded-2xl border bg-white p-6 shadow-sm"
          dangerouslySetInnerHTML={{ __html: instructionsHtml as string }}
        />
      )}

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <LearningSessionPlayer cards={guide.learningSessionCards} lessonTitle={guide.title} />
      </div>
    </div>
  );
}
