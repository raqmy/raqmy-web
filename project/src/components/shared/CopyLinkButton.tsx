import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyLinkButtonProps {
  url: string;
  label?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'minimal';
}

export const CopyLinkButton: React.FC<CopyLinkButtonProps> = ({
  url,
  label = 'نسخ الرابط',
  className = '',
  variant = 'secondary',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const baseClasses = 'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all';

  let variantClasses = '';
  if (variant === 'primary') {
    variantClasses = 'bg-blue-600 text-white hover:bg-blue-700';
  } else if (variant === 'secondary') {
    variantClasses = 'bg-gray-100 text-gray-700 hover:bg-gray-200';
  } else if (variant === 'minimal') {
    variantClasses = 'bg-transparent text-gray-600 hover:bg-gray-100';
  }

  return (
    <button
      onClick={handleCopy}
      className={`${baseClasses} ${variantClasses} ${className}`}
      title={url}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          <span>تم النسخ!</span>
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};
