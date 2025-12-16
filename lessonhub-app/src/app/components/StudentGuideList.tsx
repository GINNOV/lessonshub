'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import StudentGuideCard from '@/app/components/StudentGuideCard';
import { Search } from 'lucide-react';

export type StudentGuideSummary = {
  id: string;
  title: string;
  lessonPreview: string | null;
  difficulty: number;
  price: number;
  updatedAt: string;
  cardCount: number;
  guideCardImage: string | null;
  guideIsFreeForAll: boolean;
};

interface StudentGuideListProps {
  guides: StudentGuideSummary[];
  copy?: {
    searchPlaceholder: string;
    emptyPaid: string;
  };
}

export default function StudentGuideList({ guides, copy }: StudentGuideListProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return guides;
    return guides.filter((guide) => {
      const title = guide.title?.toLowerCase() ?? '';
      const preview = guide.lessonPreview?.toLowerCase() ?? '';
      return title.includes(term) || preview.includes(term);
    });
  }, [guides, search]);

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          placeholder={copy?.searchPlaceholder || "Search Hub Guides..."}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
          {copy?.emptyPaid || "No Hub Guides available yet. New guides will appear here automatically."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((guide) => (
            <StudentGuideCard key={guide.id} guide={guide} />
          ))}
        </div>
      )}
    </div>
  );
}
