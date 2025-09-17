// file: src/app/share/lesson/[shareId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, redirect } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { assignLessonByShareId } from '@/actions/lessonActions';
import { toast } from 'sonner';

export default function JoinLessonPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [message, setMessage] = useState('Joining lesson...');

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated') {
      toast.error("Please sign in to join the lesson.");
      router.push('/signin');
      return;
    }

    const handleJoin = async () => {
      // Ensure params and shareId exist before proceeding
      if (!params || !params.shareId) {
          setMessage("Invalid share link.");
          return;
      }
      
      const shareId = params.shareId as string;
      if (!session?.user?.id) return;

      const result = await assignLessonByShareId(shareId, session.user.id);

      if (result.success && result.assignment) {
        toast.success("Lesson joined successfully!");
        // Use redirect for navigation after server actions
        redirect(`/assignments/${result.assignment.id}`);
      } else {
        toast.error(result.error || "Failed to join the lesson.");
        router.push('/my-lessons');
      }
    };

    handleJoin();
  }, [status, session, params, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>{message}</p>
    </div>
  );
}