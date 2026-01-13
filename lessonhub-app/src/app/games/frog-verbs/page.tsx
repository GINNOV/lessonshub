export const metadata = {
  title: 'Frog Verbs | LessonHub',
  description: 'Hop across the river while practicing English past tense verbs.',
};

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import FrogVerbsGame from './FrogVerbsGame';

export default async function FrogVerbsGamePage() {
  const session = await auth();
  if (!session) {
    redirect('/signin');
  }

  return <FrogVerbsGame />;
}
