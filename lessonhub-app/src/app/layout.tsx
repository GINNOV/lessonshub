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
const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const facebookDomainVerification = process.env.NEXT_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "LessonHUB: Impara l'inglese per solo €10 euro al mese!",
    template: '%s | LessonHUB',
  },
  description:
    'Il minimo di grammatica possibile. Impara da situazioni reali. Per essere fluente nel leggere notizie o conversare con americani come le persone normali.',
  manifest: '/favicon/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon/favicon.ico' },
      { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  verification: {
    ...(googleSiteVerification ? { google: googleSiteVerification } : {}),
    ...(facebookDomainVerification
      ? { other: { 'facebook-domain-verification': facebookDomainVerification } }
      : {}),
  },
  openGraph: {
    title: "LessonHUB: Impara l'inglese per solo €10 euro al mese!",
    description:
      'Il minimo di grammatica possibile. Impara da situazioni reali. Per essere fluente nel leggere notizie o conversare con americani come le persone normali. "The book is on the table" va bene nei libri, nella vita quotidiana la gente non parla così...',
    url: '/',
    siteName: 'LessonHUB',
    images: [
      {
        url: '/social/facebookOG.png',
        width: 1200,
        height: 628,
        alt: 'Lesson HUB, dove la lingua American si impara veramente ad un costo irrisorio.',
      },
    ],
    locale: 'it_IT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "LessonHUB: Impara l'inglese per solo €10 euro al mese!",
    description:
      'Il minimo di grammatica possibile. Impara da situazioni reali. Per essere fluente nel leggere notizie o conversare con americani come le persone normali. "The book is on the table" va bene nei libri, nella vita quotidiana la gente non parla così...',
    images: ['/social/facebookOG.png'],
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
