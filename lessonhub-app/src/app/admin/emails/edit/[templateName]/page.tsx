// file: src/app/admin/emails/edit/[templateName]/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEmailTemplateByName } from "@/actions/adminActions";
import { Role } from "@prisma/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import EmailTemplateForm from "@/app/components/EmailTemplateForm";

export default async function EditEmailTemplatePage({ params }: { params: Promise<{ templateName: string }> }) {
    const session = await auth();
    const hasAdminAccess = session && (session.user.role === Role.ADMIN || session.user.hasAdminPortalAccess);
    if (!hasAdminAccess) {
        redirect("/");
    }

    const { templateName } = await params; // This line is now corrected
    const template = await getEmailTemplateByName(templateName);

    if (!template) {
        return (
            <div className="text-slate-100">
                <h1 className="text-2xl font-bold">Template Not Found</h1>
                <p className="text-slate-300">The email template &quot;{templateName}&quot; could not be found.</p>
                <Button variant="outline" asChild className="mt-4">
                    <Link href="/admin/emails">&larr; Back to Templates</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 text-slate-100">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Edit Email Template</h1>
                    <p className="text-muted-foreground capitalize">
                        Editing: {template.name.replace(/_/g, ' ')}
                    </p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/admin/emails">&larr; Back to Templates</Link>
                </Button>
            </div>
            <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
                <EmailTemplateForm template={template} />
            </div>
        </div>
    );
}
