'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocsSidebarProps {
  meta: Record<string, string>;
  locale: string;
}

export default function DocsSidebar({ meta, locale }: DocsSidebarProps) {
  const [search, setSearch] = useState('');
  const pathname = usePathname();

  const filteredLinks = useMemo(() => {
    const entries = Object.entries(meta);
    if (!search.trim()) return entries;

    const query = search.toLowerCase();
    return entries.filter(([_, title]) => 
      title.toLowerCase().includes(query)
    );
  }, [meta, search]);

  const sidebarTitle = locale === 'it' ? 'Documentazione' : 'Documentation';
  const placeholder = locale === 'it' ? 'Cerca...' : 'Search...';
  const noResults = locale === 'it' ? 'Nessun risultato' : 'No results found';

  return (
    <div className="flex flex-col space-y-4">
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-foreground">
          {sidebarTitle}
        </h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={placeholder}
            className="pl-9 h-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      <nav className="flex flex-col space-y-1">
        {filteredLinks.length > 0 ? (
          filteredLinks.map(([slug, title]) => {
            const href = slug === 'index' ? '/docs' : `/docs/${slug}`;
            const isActive = pathname === href || (pathname === '/docs' && slug === 'index');
            
            return (
              <Link
                key={slug}
                href={href}
                className={cn(
                  "text-sm py-1.5 px-2 rounded-md transition-all",
                  isActive 
                    ? "bg-secondary text-foreground font-medium" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {title}
              </Link>
            );
          })
        ) : (
          <p className="text-xs text-muted-foreground px-2 py-4 italic">
            {noResults}
          </p>
        )}
      </nav>
    </div>
  );
}
