import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Providers from './components/Providers';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://lessonshub.vercel.app'),
  title: 'LessonHUB',
  description: 'Create and manage lessons, engage with students, and track their progress with an intuitive, modern platform.',
  openGraph: {
    title: 'LessonHUB: Education Made Engaging',
    description: 'Simplify teaching and enhance learning with intuitive tools and captivating content.',
    url: 'https://lessonshub.vercel.app', 
    siteName: 'LessonHUB',
    images: [
      {
        url: '/hero_signin.png', 
        width: 1200,
        height: 630,
        alt: 'An engaging learning environment with a teacher and students.',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className={`${inter.className} h-full flex flex-col`}>
        <Providers>
          <Navbar />
          <main className="flex-grow">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </div>
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}