'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
  const sectionTitles = useMemo(() => (
    locale === 'it'
      ? { students: 'Studenti', teachers: 'Insegnanti', billing: 'Fatturazione e Premi' }
      : { students: 'Students', teachers: 'Teachers', billing: 'Billing & Rewards' }
  ), [locale]);
  const sections = useMemo(() => {
    const grouped: Record<string, Array<[string, string]>> = { students: [], teachers: [], billing: [] };
    filteredLinks.forEach(([slug, title]) => {
      const sectionKey = slug.startsWith('teachers/')
        ? 'teachers'
        : slug.startsWith('billing-rewards/')
          ? 'billing'
          : 'students';
      grouped[sectionKey].push([slug, title]);
    });
    return [
      { key: 'students', title: sectionTitles.students, links: grouped.students },
      { key: 'billing', title: sectionTitles.billing, links: grouped.billing },
      { key: 'teachers', title: sectionTitles.teachers, links: grouped.teachers },
    ].filter((section) => section.links.length > 0);
  }, [filteredLinks, sectionTitles]);

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
        {sections.length > 0 ? (
          <Accordion
            type="multiple"
            defaultValue={sections.filter((section) => section.key !== 'teachers').map((section) => section.key)}
            className="space-y-1"
          >
            {sections.map((section) => (
              <AccordionItem key={section.key} value={section.key} className="border-0">
                <AccordionTrigger className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground/80 hover:text-foreground hover:no-underline">
                  {section.title}
                </AccordionTrigger>
                <AccordionContent className="pb-1 pt-0">
                  <div className="flex flex-col space-y-1">
                    {section.links.map(([slug, title]) => {
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
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <p className="text-xs text-muted-foreground px-2 py-4 italic">
            {noResults}
          </p>
        )}
      </nav>
    </div>
  );
}
