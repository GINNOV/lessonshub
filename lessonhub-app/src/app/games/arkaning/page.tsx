export const metadata = {
  title: 'ArkanING | LessonHub',
  description: 'Answer grammar questions to clear bricks in this Arkanoid-inspired game.',
};

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ArkaningGame from './ArkaningGame';

export default async function ArkaningGamePage() {
  const session = await auth();
  if (!session) {
    redirect('/signin');
  }

  return <ArkaningGame />;
}
