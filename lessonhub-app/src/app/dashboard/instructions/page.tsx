import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { getInstructionBookletsForTeacher } from '@/actions/instructionBookletActions';
import InstructionBookletManager from '@/app/components/InstructionBookletManager';

export default async function InstructionBookletsPage() {
  const session = await auth();
  if (!session || session.user.role !== Role.TEACHER) {
    redirect('/signin');
  }

  const booklets = await getInstructionBookletsForTeacher();
  const serializableBooklets = booklets.map((booklet) => ({
    ...booklet,
    createdAt: booklet.createdAt.toISOString(),
    updatedAt: booklet.updatedAt.toISOString(),
  }));

  return (
    <div className="p-6">
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Instruction Booklets</h1>
          <p className="mt-2 text-gray-600">
            Save ready-to-use instruction sets and reuse them whenever you create a new lesson.
          </p>
        </div>
        <InstructionBookletManager initialBooklets={serializableBooklets} />
      </div>
    </div>
  );
}
