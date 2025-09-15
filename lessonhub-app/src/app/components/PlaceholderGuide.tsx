// file: src/app/components/PlaceholderGuide.tsx
'use client';

import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { getAllPlaceholders } from '@/lib/placeholder-data';

export default function PlaceholderGuide() {
  const placeholderCategories = getAllPlaceholders();

  return (
    <DialogContent className="sm:max-w-[650px]">
      <DialogHeader>
        <DialogTitle>Available Placeholders</DialogTitle>
        <DialogDescription>
          Use these placeholders in your subject or body. They will be replaced
          with real data when the email is sent.
        </DialogDescription>
      </DialogHeader>
      <div className="max-h-[60vh] overflow-y-auto p-1 pr-4">
        <div className="space-y-6">
          {placeholderCategories.map((category) => (
            <div key={category.title}>
              <h4 className="mb-3 text-md font-semibold text-gray-800">
                {category.title}
              </h4>
              <ul className="space-y-3">
                {category.items.map(({ variable, description }) => (
                  <li key={variable} className="flex items-center gap-4">
                    <code className="flex-shrink-0 rounded bg-gray-200 px-2 py-1 font-mono text-sm text-gray-800">
                      {variable}
                    </code>
                    <span className="text-sm text-gray-600">
                      - {description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </DialogContent>
  );
}