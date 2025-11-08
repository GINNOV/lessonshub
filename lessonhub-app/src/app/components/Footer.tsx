'use client'

import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  // This will now be directly provided by Vercel.
  const rawSha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || '';
  const buildVersion = rawSha ? rawSha.substring(0, 7) : 'dev';
  const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL || '';

  return (
    <footer className="bg-gray-100 border-t mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-2 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span>© {currentYear} Garage Innovation LLC</span>
          <span>|</span>
          <span>Build: {buildVersion}</span>
        </div>
        <nav className="flex flex-wrap items-center gap-4">
          <Link href="/about" className="hover:text-gray-900">About Us</Link>
          <Link href="/contact" className="hover:text-gray-900">Contact Us</Link>
          <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
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
