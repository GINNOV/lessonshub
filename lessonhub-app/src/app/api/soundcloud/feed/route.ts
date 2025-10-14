
// file: src/app/api/soundcloud/feed/route.ts
import { NextRequest, NextResponse } from 'next/server';

function extractItems(xml: string) {
  const items: { title: string; link: string }[] = [];
  const itemRegex = /<item[\s\S]*?<\/item>/g;
  const titleRegex = /<title>([\s\S]*?)<\/title>/i;
  const linkRegex = /<link>([\s\S]*?)<\/link>/i;
  const blocks = xml.match(itemRegex) || [];
  for (const block of blocks) {
    const titleMatch = block.match(titleRegex);
    const linkMatch = block.match(linkRegex);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';
    const link = linkMatch ? linkMatch[1].trim() : '';
    if (link) items.push({ title, link });
  }
  return items;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url') || '';
    const feedUrl = url || 'https://feeds.soundcloud.com/users/soundcloud:users:1601932527/sounds.rss';
    const res = await fetch(feedUrl, { next: { revalidate: 60 } });
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 502 });
    }
    const xml = await res.text();
    const items = extractItems(xml);
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unexpected error' }, { status: 500 });
  }
}
