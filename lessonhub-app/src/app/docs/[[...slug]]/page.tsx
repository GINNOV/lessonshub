import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import { marked } from 'marked';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { parseAcceptLanguage, resolveLocale, UiLanguagePreference } from '@/lib/locale';

interface PageProps {
  params: Promise<{ 
    slug?: string[];
  }>;
}

async function getLocale() {
  const session = await auth();
  const headerList = await headers();
  const acceptLanguage = headerList.get('accept-language');
  const detectedLocales = parseAcceptLanguage(acceptLanguage);
  
  const preference = ((session?.user as any)?.uiLanguage as UiLanguagePreference) ?? 'device';
  
  return resolveLocale({
    preference,
    detectedLocales,
    supportedLocales: ['en', 'it'],
    fallback: 'en',
  });
}

async function getDocContent(slugArray: string[] | undefined, locale: string) {
  const slugParts = !slugArray || slugArray.length === 0 ? ['index'] : slugArray;
  const slug = slugParts.join('/');

  // Security check: prevent directory traversal
  const invalidSegment = slugParts.some(
    (part) => !part || part.includes('..') || part.includes('/') || part.includes('\\'),
  );
  if (invalidSegment) {
    return null;
  }

  // Try locale specific path first
  if (locale === 'it') {
    const itPath = path.join(process.cwd(), 'src/pages/docs/it', `${slug}.mdx`);
    if (fs.existsSync(itPath)) {
        try {
            const content = fs.readFileSync(itPath, 'utf8');
            return content.replace(/^---\n[\s\S]*?\n---/, '');
        } catch (e) {
            console.error(`Error reading IT doc ${slug}:`, e);
        }
    }
  }

  // Fallback to default (English)
  const defaultPath = path.join(process.cwd(), 'src/pages/docs', `${slug}.mdx`);

  try {
    if (!fs.existsSync(defaultPath)) {
      return null;
    }
    const content = fs.readFileSync(defaultPath, 'utf8');
    
    // Remove frontmatter if present (lines between --- and --- at the start)
    const contentWithoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---/, '');
    
    return contentWithoutFrontmatter;
  } catch (error) {
    console.error(`Error reading doc ${slug}:`, error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const content = await getDocContent(slug, locale);
  
  if (!content) {
    return {
      title: 'Page Not Found - LessonHub Docs',
    };
  }

  // Try to extract the first h1 as title
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : 'Documentation';

  return {
    title: `${title} - LessonHub Docs`,
  };
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const locale = await getLocale();
  const content = await getDocContent(slug, locale);

  if (!content) {
    notFound();
  }

  const htmlContent = await marked.parse(content);

  return (
    <div className="prose prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-code:text-accent prose-pre:bg-secondary/50 prose-hr:border-border max-w-none">
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </div>
  );
}
