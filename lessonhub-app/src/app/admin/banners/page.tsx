import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createStudentBannerAction, deleteStudentBannerAction, toggleStudentBannerAction, updateStudentBannerAction } from "@/actions/adminActions";

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

  const renderLocaleFlag = (locale?: string | null) => {
    if (!locale) return null;
    if (locale === "en") {
      return (
        <span
          aria-label="English"
          className="absolute left-2 top-2 inline-flex h-5 w-7 items-center justify-center overflow-hidden rounded-sm border border-slate-900/60 bg-slate-50 shadow-sm"
          title="English"
        >
          <svg viewBox="0 0 28 20" className="h-full w-full">
            <rect width="28" height="20" fill="#b91c1c" />
            <rect y="2" width="28" height="2" fill="#ffffff" />
            <rect y="6" width="28" height="2" fill="#ffffff" />
            <rect y="10" width="28" height="2" fill="#ffffff" />
            <rect y="14" width="28" height="2" fill="#ffffff" />
            <rect y="18" width="28" height="2" fill="#ffffff" />
            <rect width="12" height="10" fill="#1e3a8a" />
            <circle cx="3" cy="3" r="0.7" fill="#ffffff" />
            <circle cx="6" cy="3" r="0.7" fill="#ffffff" />
            <circle cx="9" cy="3" r="0.7" fill="#ffffff" />
            <circle cx="3" cy="6" r="0.7" fill="#ffffff" />
            <circle cx="6" cy="6" r="0.7" fill="#ffffff" />
            <circle cx="9" cy="6" r="0.7" fill="#ffffff" />
          </svg>
        </span>
      );
    }
    if (locale === "it") {
      return (
        <span
          aria-label="Italiano"
          className="absolute left-2 top-2 inline-flex h-5 w-7 items-center justify-center overflow-hidden rounded-sm border border-slate-900/60 bg-slate-50 shadow-sm"
          title="Italiano"
        >
          <svg viewBox="0 0 28 20" className="h-full w-full">
            <rect width="28" height="20" fill="#ffffff" />
            <rect width="9.33" height="20" fill="#15803d" />
            <rect x="18.66" width="9.34" height="20" fill="#b91c1c" />
          </svg>
        </span>
      );
    }
    return null;
  };

  const ctaLinkOptions = [
    { label: "My Lessons", href: "/my-lessons" },
    { label: "Profile (Status tab)", href: "/profile?tab=status" },
    { label: "Profile", href: "/profile" },
    { label: "Teachers", href: "/teachers" },
    { label: "Marketplace", href: "/marketplace" },
    { label: "Referrals", href: "/referrals" },
    { label: "Speech Practice", href: "/speechpractice" },
    { label: "Playground: Arkaning", href: "/games/arkaning" },
    { label: "Playground: Invasion", href: "/games/invasion" },
  ];

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
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="locale">Locale</label>
              <select
                id="locale"
                name="locale"
                defaultValue=""
                className="h-10 w-full rounded-md border border-slate-800 bg-slate-900/70 px-3 text-sm text-slate-100"
              >
                <option value="">All locales</option>
                <option value="en">English</option>
                <option value="it">Italiano</option>
              </select>
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
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="ctaHref">CTA Link</label>
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-[11px] font-semibold text-slate-200 hover:border-slate-500 hover:text-white"
                      aria-label="CTA link options"
                    >
                      ?
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md border-slate-800 bg-slate-900 text-slate-100">
                    <DialogHeader>
                      <DialogTitle>CTA link options</DialogTitle>
                      <DialogDescription className="text-slate-400">
                        Use internal paths. For assignment links, replace the placeholder ID.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 text-sm">
                      <ul className="space-y-2">
                        {ctaLinkOptions.map((option) => (
                          <li key={option.href} className="flex items-start justify-between gap-3">
                            <span className="text-slate-200">{option.label}</span>
                            <code className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-100">{option.href}</code>
                          </li>
                        ))}
                        <li className="flex items-start justify-between gap-3">
                          <span className="text-slate-200">Assignment (specific)</span>
                          <code className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-100">/assignments/&lt;assignmentId&gt;</code>
                        </li>
                      </ul>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
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
              <div key={banner.id} className="relative rounded-lg border border-emerald-500/40 bg-emerald-900/30 p-4">
                {renderLocaleFlag(banner.locale)}
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
                <p className="mt-2 text-xs text-slate-400">Locale: {banner.locale ?? "All"}</p>
                <p className="text-xs text-slate-400">CTA: {banner.ctaText} → {banner.ctaHref}</p>
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
                      <label className="text-xs text-emerald-100" htmlFor={`locale-${banner.id}`}>Locale</label>
                      <select
                        id={`locale-${banner.id}`}
                        name="locale"
                        defaultValue={banner.locale ?? ""}
                        className="h-9 w-full rounded-md border border-emerald-900 bg-emerald-950/60 px-2 text-xs text-slate-50"
                      >
                        <option value="">All locales</option>
                        <option value="en">English</option>
                        <option value="it">Italiano</option>
                      </select>
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
              <div key={banner.id} className="relative rounded-lg border border-slate-800/70 bg-slate-950/40 p-4">
                {renderLocaleFlag(banner.locale)}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Slide #{banner.order}</p>
                  <div className="flex items-center gap-2">
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
                    <form
                      action={async () => {
                        'use server';
                        await deleteStudentBannerAction(banner.id);
                      }}
                    >
                      <Button type="submit" size="sm" variant="outline" className="border-rose-500/70 text-rose-100 hover:border-rose-400">
                        Delete
                      </Button>
                    </form>
                  </div>
                </div>
                <p className="mt-2 text-lg font-semibold text-slate-50">{banner.title}</p>
                <p className="text-sm text-slate-200">{banner.body}</p>
                <p className="mt-2 text-xs text-slate-400">Locale: {banner.locale ?? "All"}</p>
                <p className="text-xs text-slate-400">CTA: {banner.ctaText} → {banner.ctaHref}</p>
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
                      <label className="text-xs text-slate-200" htmlFor={`locale-${banner.id}`}>Locale</label>
                      <select
                        id={`locale-${banner.id}`}
                        name="locale"
                        defaultValue={banner.locale ?? ""}
                        className="h-9 w-full rounded-md border border-slate-800 bg-slate-950/80 px-2 text-xs text-slate-50"
                      >
                        <option value="">All locales</option>
                        <option value="en">English</option>
                        <option value="it">Italiano</option>
                      </select>
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
