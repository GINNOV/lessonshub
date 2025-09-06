// file: src/app/admin/emails/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEmailTemplates } from "@/actions/adminActions";
import { Role } from "@prisma/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function EmailTemplatesPage() {
    const session = await auth();
    if (!session || session.user.role !== Role.ADMIN) {
        redirect("/");
    }

    const templates = await getEmailTemplates();

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Email Template Editor</h1>
            <div className="bg-white p-6 rounded-lg shadow-md border">
                <ul className="divide-y divide-gray-200">
                    {templates.map(template => (
                        <li key={template.id} className="py-4 flex justify-between items-center">
                            <div>
                                <p className="text-lg font-semibold capitalize">{template.name.replace(/_/g, ' ')}</p>
                                <p className="text-sm text-gray-500">{template.subject}</p>
                            </div>
                            <Button asChild>
                                <Link href={`/admin/emails/edit/${template.name}`}>Edit</Link>
                            </Button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}