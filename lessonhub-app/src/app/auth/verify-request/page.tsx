// file: src/app/auth/verify-request/page.tsx
import Link from 'next/link';

export default function VerifyRequestPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-4 p-8 bg-white shadow-md rounded-lg text-center">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p>A sign in link has been sent to your email address.</p>
        <Link href="/" className="text-blue-600 hover:underline">
          Return to homepage
        </Link>
      </div>
    </div>
  );
}