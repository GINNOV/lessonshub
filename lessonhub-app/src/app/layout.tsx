import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Sora } from 'next/font/google';
import Providers from './components/Providers';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from "@vercel/speed-insights/next";
import PageContainer from './components/PageContainer';

const sora = Sora({ subsets: ['latin'], variable: '--font-sora', preload: false });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quantifythis.com';
const isVercelPreview = process.env.VERCEL_ENV === 'preview';
const isIndexable = process.env.NEXT_PUBLIC_ALLOW_INDEXING
  ? process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true'
  : !isVercelPreview;
const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const facebookDomainVerification = process.env.NEXT_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'LessonHUB', template: '%s | LessonHUB' },
  description: 'Create and manage lessons, engage with students, and track their progress with an intuitive, modern platform.',
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
  robots: isIndexable
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-image-preview': 'large',
          'max-snippet': -1,
          'max-video-preview': -1,
        },
      }
    : { index: false, follow: false },
  verification: {
    ...(googleSiteVerification ? { google: googleSiteVerification } : {}),
    ...(facebookDomainVerification
      ? { other: { 'facebook-domain-verification': facebookDomainVerification } }
      : {}),
  },
  openGraph: {
    title: 'LessonHUB: Education Made Engaging',
    description: 'Simplify teaching and enhance learning with intuitive tools and captivating content.',
    url: '/',
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
  twitter: {
    card: 'summary_large_image',
    title: 'LessonHUB',
    description: 'Create and manage lessons, engage with students, and track progress with a modern platform.',
    images: ['/hero_signin.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#0d1528',
  colorScheme: 'dark light',
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
