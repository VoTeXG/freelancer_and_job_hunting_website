"use client";
import React, { useMemo } from 'react';
import { sanitizeRichTextHTML } from '@/lib/sanitize';

interface SafeRichTextProps {
  html: string | null | undefined;
  className?: string;
  truncateChars?: number;
  reSanitize?: boolean; // default true
}

export const SafeRichText: React.FC<SafeRichTextProps> = ({ html, className, truncateChars, reSanitize = true }) => {
  const processed = useMemo(() => {
    if (!html) return '';
    const safe = reSanitize ? sanitizeRichTextHTML(html) : html;
    if (truncateChars && truncateChars > 0) {
      // Naive truncate on textContent approximation
      const textOnly = safe.replace(/<[^>]+>/g, ' ');
      if (textOnly.length > truncateChars) {
        return sanitizeRichTextHTML(textOnly.slice(0, truncateChars) + '...');
      }
    }
    return safe;
  }, [html, truncateChars, reSanitize]);
  if (!processed) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: processed }} />;
};

export default SafeRichText;
