"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { sanitizeRichTextHTML } from '@/lib/sanitize';

export interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  minHeight?: number;
}

// Minimal theme CSS note: consumer must include quill.snow.css via global import if not already.
// Using a loose type here to avoid dependency on Quill's ambient types across versions
const modulesBase: any = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "code"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "link"],
    ["clean"],
  ],
};

const formats = [
  "header",
  "bold",
  "italic",
  "underline",
  "code",
  "list",
  "bullet",
  "blockquote",
  "link",
];

// Note: We avoid react-quill because it relies on ReactDOM.findDOMNode, removed in React 19.
// This thin wrapper uses Quill directly and exposes a controlled HTML value.
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  readOnly,
  className,
  minHeight = 220,
}) => {
  // Defer loading Quill until after mount to avoid any SSR edge cases and reduce initial bundle
  // Holds the Quill constructor once dynamically loaded
  const [QuillCtor, setQuillCtor] = useState<any | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Wrapper that will contain both toolbar and editor (we manage all children)
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // Host element passed to Quill; created dynamically so toolbar stays within wrapper
  const hostRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<any | null>(null);
  const lastEmittedHtmlRef = useRef<string>("");
  const modules = useMemo(() => modulesBase, []);

  // Dynamically import Quill client-side only
  useEffect(() => {
    let active = true;
    if (!QuillCtor) {
      import('quill')
        .then((mod) => {
          if (!active) return;
          // Support various export styles: default, named Quill, or module itself
          const ctor = (mod && (mod as any).default) || (mod as any).Quill || mod;
          // Rudimentary guard: ensure it's constructable
          if (typeof ctor === 'function') {
            setQuillCtor(() => ctor);
          } else {
            setLoadError('Editor library failed to load (invalid export)');
          }
        })
        .catch((err) => {
          if (!active) return;
          setLoadError('Editor failed to load');
          // eslint-disable-next-line no-console
          console.warn('Quill dynamic import failed:', err);
        });
    }
    return () => {
      active = false;
    };
  }, [QuillCtor]);

  // Initialize Quill once
  useEffect(() => {
    if (!wrapperRef.current || quillRef.current || !QuillCtor) return;

    // Ensure the wrapper is clean before initializing (Strict Mode, HMR)
    try { wrapperRef.current.innerHTML = ''; } catch {}

    // Create a dedicated host element so Quill keeps everything inside wrapper
    const host = document.createElement('div');
    hostRef.current = host;
    wrapperRef.current.appendChild(host);

    let q: any;
    try {
      q = new (QuillCtor as any)(host, {
      theme: "snow",
      modules,
      readOnly,
      placeholder,
      formats,
    });
    } catch (e) {
      setLoadError('Editor init error');
      // eslint-disable-next-line no-console
      console.error('Quill init failed:', e);
      return;
    }
    quillRef.current = q;

    // Wire change handler
    const onTextChange = () => {
      const html = (q.root as HTMLDivElement).innerHTML;
      // Prevent feedback loops when we programmatically set contents
      if (html === lastEmittedHtmlRef.current) return;
      const sanitized = sanitizeRichTextHTML(html);
      lastEmittedHtmlRef.current = sanitized;
      onChange(sanitized);
    };
    q.on("text-change", onTextChange);

    // Set initial value
    const initial = sanitizeRichTextHTML(value || "");
    if (initial) {
      q.clipboard.dangerouslyPasteHTML(initial);
      lastEmittedHtmlRef.current = (q.root as HTMLDivElement).innerHTML;
    }

    // Apply min height to editor area
    const editorEl = (q.root as HTMLDivElement);
    editorEl.style.minHeight = `${minHeight}px`;

    return () => {
      // Remove listeners and release ref
      q.off("text-change", onTextChange);
      quillRef.current = null;
      // Clean wrapper to prevent duplicate toolbars on re-mount (Strict Mode, HMR)
      try { if (wrapperRef.current) wrapperRef.current.innerHTML = ''; } catch {}
      hostRef.current = null;
    };
  }, [modules, minHeight, QuillCtor, readOnly, placeholder]);

  // Sync external value changes
  useEffect(() => {
    const q = quillRef.current;
    if (!q || !QuillCtor) return;
    const currentHtml = (q.root as HTMLDivElement).innerHTML;
    const next = sanitizeRichTextHTML(value || "");
    if (next !== currentHtml) {
      const selection = q.getSelection();
      q.clipboard.dangerouslyPasteHTML(next);
      lastEmittedHtmlRef.current = (q.root as HTMLDivElement).innerHTML;
      if (selection) {
        // Restore caret position if possible
        const length = q.getLength();
        const index = Math.min(selection.index, Math.max(0, length - 1));
        q.setSelection(index, selection.length, "silent");
      }
    }
  }, [value]);

  // Toggle readOnly dynamically
  useEffect(() => {
    const q = quillRef.current;
    if (!q || !QuillCtor) return;
    q.enable(!readOnly);
  }, [readOnly]);

  // Update placeholder dynamically
  useEffect(() => {
    const q = quillRef.current;
    if (!q || !QuillCtor) return;
    const root = q.root as HTMLDivElement;
    if (placeholder) {
      root.setAttribute('data-placeholder', placeholder);
    } else {
      root.removeAttribute('data-placeholder');
    }
  }, [placeholder]);

  return (
    <div className={className} ref={wrapperRef}>
      {!QuillCtor && !loadError && (
        <div className="animate-pulse text-sm text-[var(--text-secondary)]">Loading editor...</div>
      )}
      {loadError && (
        <div className="text-xs text-red-500">{loadError}</div>
      )}
    </div>
  );
};

export default RichTextEditor;
