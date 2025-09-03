'use client'

import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  // Vercel provides these variables during the build. We use them for the version.
  const rawSha =
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    '';
  const buildVersion = rawSha ? rawSha.substring(0, 7) : 'dev';
  const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL || '';

  return (
    <footer className="bg-gray-100 border-t mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center text-sm text-gray-500">
        <div>
          <span>© {currentYear} Garage Innovation LLC</span>
          <span className="mx-2">|</span>
          <span>Build: {buildVersion}</span>
        </div>
        <nav>
          {docsUrl && (
            <Link href={docsUrl} className="hover:text-gray-900" target="_blank" rel="noopener noreferrer">
              Docs
            </Link>
          )}
        </nav>
      </div>
    </footer>
  );
}