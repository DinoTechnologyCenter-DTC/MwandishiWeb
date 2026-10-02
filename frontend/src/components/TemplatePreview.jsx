import React from 'react';
import {
  SAMPLE_CV, SAMPLE_EXACT, SAMPLE_LETTER,
  cvToHTML, cvExactHTML, letterToHTML,
} from '../lib/store.js';

// Single source of truth for how a template is drawn, so /templates and the
// landing page can never drift apart.
export function sheetFor(t) {
  if (t.kind === 'letter') return { cls: 'cv-sheet tpl-letter', html: letterToHTML(SAMPLE_LETTER) };
  if (t.slug === 'exact') return { cls: 'cv-sheet tpl-exact', html: cvExactHTML(SAMPLE_EXACT) };
  return { cls: `cv-sheet tpl-${t.slug}`, html: cvToHTML(SAMPLE_CV) };
}

export function useLinkFor(tpl) {
  return tpl.useLink ? `/${tpl.useLink.replace('.html', '')}` : `/new-cv?template=${tpl.slug}`;
}

// Scaled live preview of the real CV markup, clipped to a paper frame.
export default function TemplatePreview({ tpl, className = 'cv-frame cv-frame-sm' }) {
  const s = sheetFor(tpl);
  return (
    <div className={className}>
      <div className={`${s.cls} cv-zoom`} dangerouslySetInnerHTML={{ __html: s.html }}></div>
    </div>
  );
}
