import sanitizeHtml from 'sanitize-html';

/**
 * Central HTML sanitization policy.
 * Tight baseline: allow minimal formatting only until rich text editor ships.
 */
export function sanitizeUserHTML(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [ 'b', 'i', 'em', 'strong', 'u', 'code', 'br', 'p', 'ul', 'ol', 'li' ],
    allowedAttributes: {
      // no attributes currently
    },
    disallowedTagsMode: 'discard',
    enforceHtmlBoundary: true,
    transformTags: {
      // Strip nested scripts/styles entirely (defense-in-depth)
      'script': () => ({ tagName: 'noscript', text: '', attribs: {} }),
      'style': () => ({ tagName: 'span', text: '', attribs: {} })
    },
    // Avoid automatic linkifying for now (explicit rendering layer can add safe links)
    allowVulnerableTags: false
  }).trim();
}

// Convenience wrapper for nullable inputs
export function maybeSanitize(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  if (!input.trim()) return undefined;
  return sanitizeUserHTML(input);
}

/**
 * Rich text sanitizer for the upcoming editor.
 * Allow a controlled superset of formatting: headings, inline styles, code blocks, links, blockquote, lists.
 * Disallow inline event handlers, style attributes, and restrict links to safe protocols.
 */
export function sanitizeRichTextHTML(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [
      'p','br','ul','ol','li','strong','b','em','i','u','code','pre','blockquote','a','h1','h2','h3','h4','h5','h6'
    ],
    allowedAttributes: {
      a: ['href','title','rel','target'],
      code: ['class'],
      pre: ['class']
    },
    allowedSchemes: ['http','https','mailto'],
    allowedSchemesByTag: {},
    allowedSchemesAppliedToAttributes: ['href'],
    allowProtocolRelative: false,
    transformTags: {
      'script': () => ({ tagName: 'noscript', text: '', attribs: {} }),
      'style': () => ({ tagName: 'span', text: '', attribs: {} }),
      'a': (tagName: string, attribs: any) => {
        const href = attribs.href || '';
        // Strip javascript: and data: URIs
        if (/^javascript:/i.test(href) || /^data:/i.test(href)) {
          return { tagName: 'span', text: '', attribs: {} };
        }
        const clean: any = { ...attribs };
        // Force noreferrer noopener for targets
        if (clean.target === '_blank') {
          clean.rel = 'noopener noreferrer';
        }
        return { tagName: 'a', attribs: clean } as any;
      }
    },
    disallowedTagsMode: 'discard',
    enforceHtmlBoundary: true,
    parser: { lowerCaseAttributeNames: true },
    allowVulnerableTags: false
  }).trim();
}
