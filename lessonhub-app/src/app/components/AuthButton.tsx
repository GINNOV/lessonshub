// file: app/components/AuthButton.tsx

'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export default function AuthButton() {
  const { data: session } = useSession();

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <p>Signed in as {session.user?.email}</p>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 font-semibold text-white bg-red-500 rounded-md hover:bg-red-600"
        >
          Sign Out
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-4">
      <p>Not signed in</p>
      <button
        onClick={() => signIn('google')}
        className="px-4 py-2 font-semibold text-white bg-blue-500 rounded-md hover:bg-blue-600"
      >
        Sign In with Google
      </button>
    </div>
  );
}