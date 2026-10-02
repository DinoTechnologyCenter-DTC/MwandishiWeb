import React from 'react';

/**
 * Port of the kokonutui "AI Text Loading" component (MIT, @kokonutui) to this
 * codebase's stack. The original is built for Tailwind + shadcn + TypeScript +
 * `motion/react`; this app is Bootstrap 5 + SCSS + plain JSX, so adding that
 * toolchain for one animation was not worth it. The look and behaviour are the
 * same: cycling status text, each one fading up as the previous fades out,
 * over a continuously shimmering gradient.
 *
 * Motion is CSS keyframes rather than framer-motion, and text is passed in so
 * it can be translated.
 */
export default function AITextLoading({ texts, interval = 1500, className = '' }) {
  const list = React.useMemo(
    () => (Array.isArray(texts) ? texts.filter(Boolean) : []).slice(0, 8),
    [texts],
  );
  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    if (list.length < 2) return undefined;
    const id = setInterval(() => setI((n) => (n + 1) % list.length), interval);
    return () => clearInterval(id);
  }, [list.length, interval]);

  // A shorter list must not leave the index pointing past its end.
  React.useEffect(() => { setI(0); }, [list.length]);

  if (!list.length) return null;
  return (
    <div className={`ai-load ${className}`} role="status" aria-live="polite">
      <span className="ai-load-track">
        <span className="ai-load-text" key={i}>{list[i]}</span>
      </span>
    </div>
  );
}
