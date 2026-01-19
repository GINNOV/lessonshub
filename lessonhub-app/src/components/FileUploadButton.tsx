'use client';

import { forwardRef, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

type FileUploadButtonProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
  className?: string;
  hideSelectedText?: boolean;
  allowClear?: boolean;
  clearLabel?: string;
  appearance?: 'upload' | 'button';
  buttonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
};

const FileUploadButton = forwardRef<HTMLInputElement, FileUploadButtonProps>(
  (
    {
      label = 'Upload',
      className,
      hideSelectedText = false,
      allowClear = false,
      clearLabel = 'Clear',
      appearance = 'upload',
      buttonVariant = 'outline',
      buttonSize = 'sm',
      disabled,
      onChange,
      ...props
    },
    ref
  ) => {
    const [selectedText, setSelectedText] = useState<string>('');
    const inputRef = useRef<HTMLInputElement | null>(null);

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

    const handleClear = () => {
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      setSelectedText('');
    };

    const setRefs = (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    return (
      <div className={cn('flex flex-wrap items-center gap-3', className)}>
        <label
          className={cn(
            appearance === 'button'
              ? buttonVariants({ variant: buttonVariant, size: buttonSize })
              : 'inline-flex items-center gap-2 rounded-xl border border-dashed border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 focus-within:ring-2 focus-within:ring-indigo-200',
            'cursor-pointer',
            disabled && 'cursor-not-allowed opacity-60 hover:bg-indigo-50'
          )}
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          <span>{label}</span>
          <input
            ref={setRefs}
            type="file"
            className="sr-only"
            disabled={disabled}
            onClick={(event) => {
              const target = event.currentTarget as HTMLInputElement;
              target.value = '';
            }}
            onChange={handleChange}
            {...props}
          />
        </label>
        {!hideSelectedText && selectedText && (
          <span className="text-xs text-gray-500 truncate max-w-[220px]">{selectedText}</span>
        )}
        {allowClear && selectedText && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-semibold text-slate-500 underline-offset-4 hover:underline"
          >
            {clearLabel}
          </button>
        )}
      </div>
    );
  }
);

FileUploadButton.displayName = 'FileUploadButton';

export default FileUploadButton;
