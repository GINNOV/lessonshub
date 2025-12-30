// file: src/components/EmailTemplateList.tsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { EmailTemplate } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EmailTemplateListProps {
  templates: EmailTemplate[];
}

export default function EmailTemplateList({ templates }: EmailTemplateListProps) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const categories = useMemo(() => {
    const unique = new Set<string>();
    templates.forEach((template) => {
      if (template.category) unique.add(template.category);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [templates]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filteredTemplates = templates.filter((template) => {
      if (categoryFilter !== 'all' && template.category !== categoryFilter) {
        return false;
      }
      if (!normalized) return true;
      const haystack = [
        template.name,
        template.subject,
        template.description ?? '',
        template.category ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalized);
    });

    return filteredTemplates.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (nameA === nameB) return 0;
      return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
  }, [categoryFilter, query, sortOrder, templates]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-[260px] flex-1">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search templates..."
            className="w-full border-slate-800 bg-slate-950/70 text-slate-100"
          />
        </div>
        <div className="min-w-[160px]">
          <p className="text-xs font-semibold text-slate-400">Category</p>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
          >
            <option value="all">All</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px]">
          <p className="text-xs font-semibold text-slate-400">Sort</p>
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as 'asc' | 'desc')}
            className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
          >
            <option value="asc">A → Z</option>
            <option value="desc">Z → A</option>
          </select>
        </div>
      </div>

      <ul className="divide-y divide-slate-800">
        {filtered.length === 0 && (
          <li className="py-6 text-sm text-slate-400">No templates match that search.</li>
        )}
        {filtered.map((template) => (
          <li key={template.id} className="py-4 flex justify-between items-center gap-4">
            <div className="space-y-1">
              <p className="text-lg font-semibold capitalize text-slate-100">
                {template.name.replace(/_/g, ' ')}
              </p>
              <p className="text-sm text-slate-400">
                {template.description?.trim() || 'No description yet.'}
              </p>
              <p className="text-xs text-slate-500">
                {template.category ? `Category: ${template.category}` : 'Category not set'}
              </p>
            </div>
            <Button
              asChild
              variant="secondary"
              className="border-slate-700 bg-slate-800 text-slate-100 hover:border-teal-400/60"
            >
              <Link href={`/admin/emails/edit/${template.name}`}>Edit</Link>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
