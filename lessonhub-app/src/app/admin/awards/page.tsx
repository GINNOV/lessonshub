import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createBadgeAction, updateBadgeAction } from "@/actions/adminActions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BadgeCategory } from "@prisma/client";

export default async function AwardsDashboardPage() {
  const session = await auth();
  if (!session) redirect("/signin");
  const hasAdminAccess = session.user.role === Role.ADMIN || session.user.hasAdminPortalAccess;
  if (!hasAdminAccess) redirect("/dashboard");

  const badges = await prisma.badge.findMany({
    include: { _count: { select: { userBadges: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8 text-slate-100">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Awards &amp; Badges</h1>
          <p className="text-slate-400 mt-1">
            Review and curate the badges students can earn. Editing is coming next; share the desired rules/graphics and we&apos;ll wire them in.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="border-slate-700 bg-slate-800 text-slate-100 hover:border-teal-400/60">
            <Link href="/admin">← Admin home</Link>
          </Button>
          <Button asChild variant="outline" className="border-slate-700 bg-slate-800 text-slate-100 hover:border-teal-400/60">
            <Link href="/dashboard">← Teacher dashboard</Link>
          </Button>
        </div>
      </div>

      <Card className="border-slate-800/70 bg-slate-900/70 text-slate-100">
        <CardHeader>
          <CardTitle>Add a new badge</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData) => {
              'use server';
              await createBadgeAction(formData);
            }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="name">Name</label>
              <Input id="name" name="name" placeholder="e.g., Consistency Champ" required className="border-slate-800 bg-slate-900/70 text-slate-100" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="slug">Slug</label>
              <Input id="slug" name="slug" placeholder="consistency-champ" required className="border-slate-800 bg-slate-900/70 text-slate-100 lowercase" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                defaultValue={BadgeCategory.PROGRESSION}
                className="w-full rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
              >
                {Object.values(BadgeCategory).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="icon">Icon (optional)</label>
              <Input id="icon" name="icon" placeholder="emoji or URL" className="border-slate-800 bg-slate-900/70 text-slate-100" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="description">Description</label>
              <Textarea
                id="description"
                name="description"
                placeholder="What this badge means and when it should be awarded."
                className="min-h-[80px] border-slate-800 bg-slate-900/70 text-slate-100"
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" className="w-full md:w-auto">Create badge</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-800/70 bg-slate-900/70 text-slate-100">
        <CardHeader>
          <CardTitle>Available badges</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {badges.length === 0 && (
            <p className="text-sm text-slate-400">
              No badges found yet. Add them via seed/migration and they&apos;ll appear here for assignment rules.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {badges.map((badge) => (
              <div key={badge.id} className="rounded-lg border border-slate-800/70 bg-slate-950/40 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-50">{badge.name}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-400">{badge.category}</p>
                  </div>
                  <span className="rounded-full border border-amber-400/60 bg-amber-900/30 px-3 py-1 text-xs font-semibold text-amber-100">
                    {badge._count.userBadges} awarded
                  </span>
                </div>
                <form
                  action={async (formData) => {
                    'use server';
                    await updateBadgeAction(formData);
                  }}
                  className="space-y-3"
                >
                  <input type="hidden" name="id" value={badge.id} />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300" htmlFor={`name-${badge.id}`}>Name</label>
                      <Input
                        id={`name-${badge.id}`}
                        name="name"
                        defaultValue={badge.name}
                        className="border-slate-800 bg-slate-900/70 text-slate-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300" htmlFor={`slug-${badge.id}`}>Slug</label>
                      <Input
                        id={`slug-${badge.id}`}
                        name="slug"
                        defaultValue={badge.slug}
                        className="border-slate-800 bg-slate-900/70 text-slate-100 lowercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300" htmlFor={`category-${badge.id}`}>Category</label>
                      <select
                        id={`category-${badge.id}`}
                        name="category"
                        defaultValue={badge.category}
                        className="w-full rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
                      >
                        {Object.values(BadgeCategory).map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300" htmlFor={`icon-${badge.id}`}>Icon (optional)</label>
                      <Input
                        id={`icon-${badge.id}`}
                        name="icon"
                        defaultValue={badge.icon ?? ""}
                        placeholder="emoji or URL"
                        className="border-slate-800 bg-slate-900/70 text-slate-100"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300" htmlFor={`description-${badge.id}`}>Description</label>
                    <Textarea
                      id={`description-${badge.id}`}
                      name="description"
                      defaultValue={badge.description}
                      className="min-h-[70px] border-slate-800 bg-slate-900/70 text-slate-100"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Created {new Date(badge.createdAt).toLocaleDateString()}</span>
                    <Button type="submit" size="sm" className="px-4">Save changes</Button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed border-slate-700 bg-slate-900/50 text-slate-100">
        <CardHeader>
          <CardTitle>Customization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-slate-300">
            Want to add/update awards? Share the badge name, slug, category, icon, and unlock rules. We&apos;ll seed the badge and hook it into the
            gamification rules so cron/job notifications stay consistent.
          </p>
          <p className="text-sm text-slate-400">
            Tip: keep slugs stable; edits should be additive to avoid breaking historical awards.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
