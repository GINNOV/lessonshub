// file: src/app/components/Rating.tsx
'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingProps {
  initialRating?: number;
  readOnly?: boolean;
  onRatingChange?: (rating: number) => void;
  starSize?: number;
  totalStars?: number;
  disabled?: boolean;
}

export default function Rating({
  initialRating = 0,
  readOnly = false,
  onRatingChange,
  starSize = 24,
  totalStars = 5,
  disabled = false,
}: RatingProps) {
  const [rating, setRating] = useState(initialRating);
  const [hoverValue, setHoverValue] = useState<number | undefined>(undefined);

  const handleClick = (value: number) => {
    if (readOnly) return;
    setRating(value);
    if (onRatingChange) {
      onRatingChange(value);
    }
  };

  return (
    <div className="flex items-center">
      {Array.from({ length: totalStars }, (_, i) => (
        <Star
          key={i}
          size={starSize}
          className={cn(
            "cursor-pointer",
            (hoverValue || rating) > i ? "text-yellow-400 fill-yellow-400" : "text-gray-300",
            (disabled || readOnly) && "cursor-not-allowed opacity-50"
          )}
          onClick={() => handleClick(i + 1)}
          onMouseEnter={() => !disabled && !readOnly && setHoverValue(i + 1)}
          onMouseLeave={() => !disabled && !readOnly && setHoverValue(undefined)}
        />
      ))}
    </div>
  );
}