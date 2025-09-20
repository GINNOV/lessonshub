// file: src/app/admin/teachers/[teacherId]/page.tsx

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import AssignStudentsForm from "@/app/components/AssignStudentsForm";
import { getAssignedStudents } from "@/actions/adminActions";

async function getTeacher(teacherId: string) {
    return prisma.user.findUnique({ where: { id: teacherId, role: Role.TEACHER } });
}

async function getAllStudents() {
    return prisma.user.findMany({ where: { role: Role.STUDENT }, orderBy: { name: 'asc' } });
}

export default async function AssignStudentsPage({ params }: { params: { teacherId: string } }) {
    const session = await auth();
    if (!session || session.user.role !== Role.ADMIN) {
        redirect("/");
    }

    const { teacherId } = params;
    const [teacher, allStudents, assignedStudents] = await Promise.all([
        getTeacher(teacherId),
        getAllStudents(),
        getAssignedStudents(teacherId)
    ]);

    if (!teacher) {
        return (
            <div>
                <h1 className="text-2xl font-bold">Teacher Not Found</h1>
                <Button asChild variant="outline" className="mt-4">
                    <Link href="/admin/users">&larr; Back to User Management</Link>
                </Button>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Assign Students</h1>
                    <p className="text-muted-foreground">
                        Managing students for: {teacher.name || teacher.email}
                    </p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/admin/users">&larr; Back to User Management</Link>
                </Button>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border">
                <AssignStudentsForm
                    teacherId={teacher.id}
                    allStudents={allStudents}
                    assignedStudentIds={assignedStudents.map(s => s.id)}
                />
            </div>
        </div>
    );
}