// file: src/app/components/Rating.tsx
'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingProps {
  count?: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function Rating({ count = 5, value, onChange, disabled = false }: RatingProps) {
  const [hoverValue, setHoverValue] = useState<number | undefined>(undefined);

  return (
    <div className="flex items-center space-x-1">
      {Array.from({ length: count }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "h-6 w-6 cursor-pointer",
            (hoverValue || value) > i ? "text-yellow-400 fill-yellow-400" : "text-gray-300",
            disabled && "cursor-not-allowed opacity-50"
          )}
          onClick={() => !disabled && onChange(i + 1)}
          onMouseEnter={() => !disabled && setHoverValue(i + 1)}
          onMouseLeave={() => !disabled && setHoverValue(undefined)}
        />
      ))}
    </div>
  );
}