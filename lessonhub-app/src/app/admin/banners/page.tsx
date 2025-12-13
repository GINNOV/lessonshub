import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createStudentBannerAction, toggleStudentBannerAction, updateStudentBannerAction } from "@/actions/adminActions";

export default async function StudentBannersPage() {
  const session = await auth();
  if (!session) redirect("/signin");
  const hasAdminAccess = session.user.role === Role.ADMIN || session.user.hasAdminPortalAccess;
  if (!hasAdminAccess) redirect("/dashboard");

  const banners = await prisma.studentBanner.findMany({
    orderBy: [
      { order: "asc" },
      { createdAt: "desc" },
    ],
  });

  return (
    <div className="space-y-8 text-slate-100">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Student Banner</h1>
          <p className="text-slate-400 mt-1">
            Create rotating banner slides for the student dashboard. Active banners rotate in the carousel above the guides tab.
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
          <CardTitle>Add a banner slide</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData) => {
              'use server';
              await createStudentBannerAction(formData);
            }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="kicker">Kicker</label>
              <Input id="kicker" name="kicker" placeholder="Hub Guides" required className="border-slate-800 bg-slate-900/70 text-slate-100" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="order">Order</label>
              <Input id="order" name="order" type="number" defaultValue={banners.length} className="border-slate-800 bg-slate-900/70 text-slate-100" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="title">Title</label>
              <Input id="title" name="title" placeholder="Always-on practice hub" required className="border-slate-800 bg-slate-900/70 text-slate-100" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="body">Body</label>
              <Textarea
                id="body"
                name="body"
                placeholder="Explain the benefit of the guides or a timely promotion."
                required
                className="min-h-[80px] border-slate-800 bg-slate-900/70 text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="ctaText">CTA Text</label>
              <Input id="ctaText" name="ctaText" placeholder="Unlock Hub Guides" required className="border-slate-800 bg-slate-900/70 text-slate-100" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="ctaHref">CTA Link</label>
              <Input id="ctaHref" name="ctaHref" defaultValue="/profile?tab=status" className="border-slate-800 bg-slate-900/70 text-slate-100" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" className="w-full md:w-auto">Create banner</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-800/70 bg-slate-900/70 text-slate-100">
        <CardHeader>
          <CardTitle>Active carousel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {banners.filter(b => b.isActive).length === 0 && (
            <p className="text-sm text-slate-400">No active banners yet.</p>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {banners.filter(b => b.isActive).map((banner) => (
              <div key={banner.id} className="rounded-lg border border-emerald-500/40 bg-emerald-900/30 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-wide text-emerald-200">Slide #{banner.order}</p>
                  <form
                    action={async () => {
                      'use server';
                      await toggleStudentBannerAction(banner.id, false);
                    }}
                  >
                    <Button type="submit" size="sm" variant="outline" className="border-emerald-400/70 text-emerald-50 hover:border-rose-400/70">
                      Disable
                    </Button>
                  </form>
                </div>
                <p className="mt-2 text-lg font-semibold text-slate-50">{banner.title}</p>
                <p className="text-sm text-slate-200">{banner.body}</p>
                <p className="mt-2 text-xs text-slate-400">CTA: {banner.ctaText} → {banner.ctaHref}</p>
                <details className="mt-3 rounded border border-emerald-800/50 bg-emerald-950/30 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-emerald-200">Edit banner</summary>
                  <form
                    action={async (formData) => {
                      "use server";
                      await updateStudentBannerAction(formData);
                    }}
                    className="mt-3 grid grid-cols-1 gap-3"
                  >
                    <input type="hidden" name="id" value={banner.id} />
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs text-emerald-100" htmlFor={`kicker-${banner.id}`}>Kicker</label>
                        <Input id={`kicker-${banner.id}`} name="kicker" defaultValue={banner.kicker ?? ""} className="border-emerald-900 bg-emerald-950/60 text-slate-50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-emerald-100" htmlFor={`order-${banner.id}`}>Order</label>
                        <Input id={`order-${banner.id}`} name="order" type="number" defaultValue={banner.order} className="border-emerald-900 bg-emerald-950/60 text-slate-50" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-emerald-100" htmlFor={`title-${banner.id}`}>Title</label>
                      <Input id={`title-${banner.id}`} name="title" defaultValue={banner.title} className="border-emerald-900 bg-emerald-950/60 text-slate-50" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-emerald-100" htmlFor={`body-${banner.id}`}>Body</label>
                      <Textarea id={`body-${banner.id}`} name="body" defaultValue={banner.body} className="min-h-[80px] border-emerald-900 bg-emerald-950/60 text-slate-50" />
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs text-emerald-100" htmlFor={`ctaText-${banner.id}`}>CTA Text</label>
                        <Input id={`ctaText-${banner.id}`} name="ctaText" defaultValue={banner.ctaText} className="border-emerald-900 bg-emerald-950/60 text-slate-50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-emerald-100" htmlFor={`ctaHref-${banner.id}`}>CTA Link</label>
                        <Input id={`ctaHref-${banner.id}`} name="ctaHref" defaultValue={banner.ctaHref} className="border-emerald-900 bg-emerald-950/60 text-slate-50" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" className="bg-emerald-600 text-white hover:bg-emerald-500">Save changes</Button>
                    </div>
                  </form>
                </details>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800/70 bg-slate-900/70 text-slate-100">
        <CardHeader>
          <CardTitle>Inactive banner library</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {banners.filter(b => !b.isActive).length === 0 && (
            <p className="text-sm text-slate-400">No inactive banners.</p>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {banners.filter(b => !b.isActive).map((banner) => (
              <div key={banner.id} className="rounded-lg border border-slate-800/70 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Slide #{banner.order}</p>
                  <form
                    action={async () => {
                      'use server';
                      await toggleStudentBannerAction(banner.id, true);
                    }}
                  >
                    <Button type="submit" size="sm" variant="outline" className="border-slate-600 text-slate-100 hover:border-emerald-400/70">
                      Activate
                    </Button>
                  </form>
                </div>
                <p className="mt-2 text-lg font-semibold text-slate-50">{banner.title}</p>
                <p className="text-sm text-slate-200">{banner.body}</p>
                <p className="mt-2 text-xs text-slate-400">CTA: {banner.ctaText} → {banner.ctaHref}</p>
                <details className="mt-3 rounded border border-slate-800/70 bg-slate-900/60 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-200">Edit banner</summary>
                  <form
                    action={async (formData) => {
                      "use server";
                      await updateStudentBannerAction(formData);
                    }}
                    className="mt-3 grid grid-cols-1 gap-3"
                  >
                    <input type="hidden" name="id" value={banner.id} />
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-200" htmlFor={`kicker-${banner.id}`}>Kicker</label>
                        <Input id={`kicker-${banner.id}`} name="kicker" defaultValue={banner.kicker ?? ""} className="border-slate-800 bg-slate-950/80 text-slate-50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-200" htmlFor={`order-${banner.id}`}>Order</label>
                        <Input id={`order-${banner.id}`} name="order" type="number" defaultValue={banner.order} className="border-slate-800 bg-slate-950/80 text-slate-50" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-200" htmlFor={`title-${banner.id}`}>Title</label>
                      <Input id={`title-${banner.id}`} name="title" defaultValue={banner.title} className="border-slate-800 bg-slate-950/80 text-slate-50" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-200" htmlFor={`body-${banner.id}`}>Body</label>
                      <Textarea id={`body-${banner.id}`} name="body" defaultValue={banner.body} className="min-h-[80px] border-slate-800 bg-slate-950/80 text-slate-50" />
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-200" htmlFor={`ctaText-${banner.id}`}>CTA Text</label>
                        <Input id={`ctaText-${banner.id}`} name="ctaText" defaultValue={banner.ctaText} className="border-slate-800 bg-slate-950/80 text-slate-50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-200" htmlFor={`ctaHref-${banner.id}`}>CTA Link</label>
                        <Input id={`ctaHref-${banner.id}`} name="ctaHref" defaultValue={banner.ctaHref} className="border-slate-800 bg-slate-950/80 text-slate-50" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" className="bg-slate-200 text-slate-900 hover:bg-slate-100">Save changes</Button>
                    </div>
                  </form>
                </details>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
