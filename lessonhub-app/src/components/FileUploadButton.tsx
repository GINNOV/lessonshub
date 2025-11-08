'use client';

import { forwardRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

type FileUploadButtonProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
  className?: string;
  hideSelectedText?: boolean;
};

const FileUploadButton = forwardRef<HTMLInputElement, FileUploadButtonProps>(
  (
    {
      label = 'Upload',
      className,
      hideSelectedText = false,
      disabled,
      onChange,
      ...props
    },
    ref
  ) => {
    const [selectedText, setSelectedText] = useState<string>('');

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!hideSelectedText) {
        const files = event.target.files;
        if (files && files.length > 0) {
          setSelectedText(files.length === 1 ? files[0].name : `${files.length} files selected`);
        } else {
          setSelectedText('');
        }
      }
      onChange?.(event);
    };

    return (
      <div className={cn('flex flex-wrap items-center gap-3', className)}>
        <label
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border border-dashed border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 focus-within:ring-2 focus-within:ring-indigo-200 cursor-pointer',
            disabled && 'cursor-not-allowed opacity-60 hover:bg-indigo-50'
          )}
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          <span>{label}</span>
          <input
            ref={ref}
            type="file"
            className="sr-only"
            disabled={disabled}
            onChange={handleChange}
            {...props}
          />
        </label>
        {!hideSelectedText && selectedText && (
          <span className="text-xs text-gray-500 truncate max-w-[220px]">{selectedText}</span>
        )}
      </div>
    );
  }
);

FileUploadButton.displayName = 'FileUploadButton';

export default FileUploadButton;
