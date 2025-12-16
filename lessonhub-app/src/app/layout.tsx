import './globals.css';
import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import Providers from './components/Providers';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from "@vercel/speed-insights/next";
import PageContainer from './components/PageContainer';

const sora = Sora({ subsets: ['latin'], variable: '--font-sora', preload: false });

export const metadata: Metadata = {
  metadataBase: new URL('https://quantifythis.com'),
  title: 'LessonHUB',
  description: 'Create and manage lessons, engage with students, and track their progress with an intuitive, modern platform.',
  // Add favicon configuration here
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'LessonHUB: Education Made Engaging',
    description: 'Simplify teaching and enhance learning with intuitive tools and captivating content.',
    url: 'https://quantifythis.com', 
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
    <html lang="en" className="h-full">
      <body
        suppressHydrationWarning
        className={`${sora.className} h-full flex flex-col antialiased`}
      >
        <Providers>
          <Navbar />
          <main className="flex-grow">
            <PageContainer>{children}</PageContainer>
          </main>
          <Footer />
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
