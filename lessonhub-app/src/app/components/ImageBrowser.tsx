// file: src/app/components/ImageBrowser.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ImageBrowserProps {
  onSelectImage: (imageUrl: string) => void;
}

export default function ImageBrowser({ onSelectImage }: ImageBrowserProps) {
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch('/api/lessons/images')
        .then((response) => response.json())
        .then((data) => {
          setImages(Array.isArray(data?.images) ? data.images : []);
        })
        .catch(() => {
          setImages([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  const handleSelect = (imageUrl: string) => {
    onSelectImage(imageUrl);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Browse</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[80vw]">
        <DialogHeader>
          <DialogTitle>Select an Existing Image</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-[70vh] overflow-y-auto p-4">
          {isLoading ? (
            <p>Loading images...</p>
          ) : images.length > 0 ? (
            images.map((imageUrl, index) => (
              <div
                key={index}
                className="cursor-pointer group relative"
                onClick={() => handleSelect(imageUrl)}
              >
                <Image
                  src={imageUrl}
                  alt={`Uploaded image ${index + 1}`}
                  width={200}
                  height={150}
                  className="rounded-md object-cover aspect-[4/3] group-hover:opacity-75 transition-opacity"
                />
              </div>
            ))
          ) : (
            <p>No previously uploaded images found.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
