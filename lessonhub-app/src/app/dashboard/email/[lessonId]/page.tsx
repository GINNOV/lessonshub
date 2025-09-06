// file: src/app/dashboard/email/[lessonId]/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLessonById } from "@/actions/lessonActions";
import { Role } from "@prisma/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import CustomEmailForm from "@/app/components/CustomEmailForm";

export default async function CustomEmailPage({ params }: { params: Promise<{ lessonId: string }> }) {
    const session = await auth();
    if (!session || session.user.role !== Role.TEACHER) {
        redirect("/");
    }

    const { lessonId } = await params;
    const lesson = await getLessonById(lessonId);

    if (!lesson) {
        return <div>Lesson not found.</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Send Custom Email</h1>
                    <p className="text-muted-foreground">For lesson: {lesson.title}</p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/dashboard">&larr; Back to Dashboard</Link>
                </Button>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border">
                <CustomEmailForm lessonId={lesson.id} />
            </div>
        </div>
    );
}