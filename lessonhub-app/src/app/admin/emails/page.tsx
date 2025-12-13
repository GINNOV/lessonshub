// file: src/app/admin/emails/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEmailTemplates } from "@/actions/adminActions";
import { Role } from "@prisma/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function EmailTemplatesPage() {
    const session = await auth();
    const hasAdminAccess = session && (session.user.role === Role.ADMIN || session.user.hasAdminPortalAccess);
    if (!hasAdminAccess) {
        redirect("/");
    }

    const templates = await getEmailTemplates();

    return (
        <div className="space-y-6 text-slate-100">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <h1 className="text-3xl font-bold">Email Template Editor</h1>
                <div className="flex gap-2">
                    <Link
                        href="/admin"
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-teal-400/60"
                    >
                        ← Admin home
                    </Link>
                    <Link
                        href="/dashboard"
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-teal-400/60"
                    >
                        ← Teacher dashboard
                    </Link>
                </div>
            </div>
            <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
                <ul className="divide-y divide-slate-800">
                    {templates.map(template => (
                        <li key={template.id} className="py-4 flex justify-between items-center">
                            <div>
                                <p className="text-lg font-semibold capitalize text-slate-100">{template.name.replace(/_/g, ' ')}</p>
                                <p className="text-sm text-slate-400">{template.subject}</p>
                            </div>
                            <Button asChild variant="secondary" className="border-slate-700 bg-slate-800 text-slate-100 hover:border-teal-400/60">
                                <Link href={`/admin/emails/edit/${template.name}`}>Edit</Link>
                            </Button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
