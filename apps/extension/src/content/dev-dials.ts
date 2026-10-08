/**
 * Dev-only DialKit panel for tuning motion live. Loaded only by `pnpm dev:dials`
 * (see DEV_DIALS in index.ts); a plain dev build and every production build leave it out.
 */
import { createDialKit, createDialRoot } from 'dialkit/vanilla';
import dialCss from 'dialkit/vanilla/styles.css?inline';
import { tuning, springFromDuration } from './motion';

let teardown: (() => void) | null = null;

export function mountDevDials(): void {
  if (teardown) return;

  // The `raval-` id makes the panel count as Raval UI, so modes and the
  // click interceptor leave it alone.
  const host = document.createElement('div');
  host.id = 'raval-dialkit';
  host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;';

  const style = document.createElement('style');
  style.textContent = dialCss;
  host.appendChild(style);
  document.documentElement.appendChild(host);

  const root = createDialRoot({ target: host, position: 'bottom-left', defaultOpen: false });

  const kit = createDialKit('Raval motion', {
    enabled: tuning.enabled,
    hover: { type: 'spring', ...tuning.hover },
    fadeIn: [tuning.fadeIn, 0, 0.6, 0.01],
    highlight: {
      radius: [tuning.radius, 0, 12, 1],
      fill: [tuning.fillAlpha, 0, 0.4, 0.01],
      stroke: [tuning.strokeAlpha, 0, 1, 0.01],
      selectedFill: [tuning.selectedFillAlpha, 0, 0.5, 0.01],
    },
    lineDraw: [tuning.lineDraw, 0, 1.2, 0.01],
    snapSettle: [tuning.snapSettle, 0, 0.6, 0.01],
  });

  const unsubscribe = kit.subscribe((v) => {
    tuning.enabled = v.enabled;
    tuning.fadeIn = v.fadeIn;
    tuning.radius = v.highlight.radius;
    tuning.fillAlpha = v.highlight.fill;
    tuning.strokeAlpha = v.highlight.stroke;
    tuning.selectedFillAlpha = v.highlight.selectedFill;
    tuning.lineDraw = v.lineDraw;
    tuning.snapSettle = v.snapSettle;

    const s = v.hover;
    if (s.type === 'spring') {
      tuning.hover = s.stiffness !== undefined && s.damping !== undefined
        ? { stiffness: s.stiffness, damping: s.damping, mass: s.mass ?? 1 }
        : springFromDuration(s.visualDuration ?? 0.2, s.bounce ?? 0);
    }
  });

  teardown = () => {
    unsubscribe();
    kit.destroy();
    root.destroy();
    host.remove();
  };
}

export function unmountDevDials(): void {
  teardown?.();
  teardown = null;
}
