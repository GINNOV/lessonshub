// file: src/app/layout.tsx

import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Providers from './components/Providers';
import Navbar from './components/Navbar'; // Import the Navbar

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LessonHub',
  description: 'Create and manage lessons.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navbar /> {/* Add the Navbar here */}
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}