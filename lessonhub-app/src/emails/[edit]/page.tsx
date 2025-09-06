// file: src/app/admin/emails/edit/[templateName]/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEmailTemplateByName } from "@/actions/adminActions";
import { Role } from "@prisma/client";
import EmailTemplateForm from "@/app/components/EmailTemplateForm";

export default async function EditEmailTemplatePage({ params }: { params: { templateName: string } }) {
    const session = await auth();
    if (!session || session.user.role !== Role.ADMIN) {
        redirect("/");
    }

    const template = await getEmailTemplateByName(params.templateName);

    if (!template) {
        return <div>Template not found.</div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6 capitalize">Editing: {template.name.replace(/_/g, ' ')}</h1>
            <div className="bg-white p-6 rounded-lg shadow-md border">
                <EmailTemplateForm template={template} />
            </div>
        </div>
    );
}