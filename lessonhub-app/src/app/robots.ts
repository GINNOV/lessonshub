import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quantifythis.com'
const isVercelPreview = process.env.VERCEL_ENV === 'preview'
const isIndexable = process.env.NEXT_PUBLIC_ALLOW_INDEXING
  ? process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true'
  : !isVercelPreview

export default function robots(): MetadataRoute.Robots {
  if (!isIndexable) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
      sitemap: `${siteUrl.replace(/\/$/, '')}/sitemap.xml`,
      host: siteUrl,
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/assignments/',
          '/my-lessons/',
          '/profile/',
          '/signin',
          '/register',
          '/auth/',
        ],
      },
    ],
    sitemap: `${siteUrl.replace(/\/$/, '')}/sitemap.xml`,
    host: siteUrl,
  }
}
