// file: src/app/not-found.tsx
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-center">
      <div className="w-full max-w-md space-y-4 p-8">
        <Image
          src="/notfound.png"
          alt="Page Not Found"
          width={400}
          height={300}
          className="mx-auto"
        />
        <h1 className="text-4xl font-bold text-gray-800">Oops! Page Not Found</h1>
        <p className="text-gray-600">
          The page you are looking for might have been moved, renamed, or is temporarily unavailable.
        </p>
        <Button asChild>
          <Link href="/">Return to Homepage</Link>
        </Button>
      </div>
    </div>
  );
}