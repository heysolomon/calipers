'use client';
import { useDemo } from './demo-provider';

/** Two sliders that cross into a close mark while the demo is open (see `.lp-sliders` in globals.css). */
const SLIDERS = (
  <svg className="lp-sliders" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <line x1="4" y1="7" x2="20" y2="7" />
    <line x1="4" y1="17" x2="20" y2="17" />
    <circle cx="9" cy="7" r="2.5" style={{ fill: 'var(--bg)' }} />
    <circle cx="15" cy="17" r="2.5" style={{ fill: 'var(--bg)' }} />
  </svg>
);

/**
 * Opens and closes the on-page demo. `icon` is the control in the header and
 * `link` sits inside a sentence. The label says what a press will do, so no
 * pressed state is announced on top of it.
 */
export function DemoTrigger({ variant }: { variant: 'icon' | 'link' }) {
  const demo = useDemo();
  const label = demo.isOpen ? 'Close demo tools' : 'Open demo tools';
  const toggle = demo.isOpen ? demo.close : demo.open;

  if (variant === 'icon') {
    return (
      <button
        type="button" onClick={toggle} data-demo-ui="true" aria-label={label}
        className="lp-icon-button lp-tip" data-open={demo.isOpen} data-tip={demo.isOpen ? 'Close the demo' : 'Try the demo'}
      >
        {SLIDERS}
      </button>
    );
  }

  return (
    <button type="button" onClick={toggle} data-demo-ui="true" className="lp-link lp-link-button">
      {demo.isOpen ? 'close the demo' : 'try the demo'}
    </button>
  );
}
