import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/** The size every platform expects for a link preview. */
export const OG_SIZE = { width: 1200, height: 630 } as const;

const ACCENT = '#FF4500';
const INK = '#000000';
const MUTED = '#636363';

const LOGO = 'M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z';
const ICON = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

// The headline's box, in the image's own pixels. Every number drawn is read
// from these, so the picture of a measuring tool measures correctly.
const BOX = { x: 170, y: 228, w: 860, h: 196 };
const MID = BOX.y + BOX.h / 2;
const GAP = BOX.x;

const chip = { position: 'absolute', height: 30, padding: '0 10px', borderRadius: 8, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' } as const;

/** The distance from the edge of the page to the headline, drawn the way Measure draws it. */
function Gap({ from }: { from: number }) {
  return (
    <div style={{ position: 'absolute', left: from, top: MID - 15, width: GAP, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 14, height: 2, background: ACCENT }} />
      <div style={{ position: 'absolute', left: from === 0 ? GAP - 2 : 0, top: 5, width: 2, height: 20, background: ACCENT }} />
      <div style={{ ...chip, position: 'relative', background: ACCENT, color: '#fff' }}>{GAP}</div>
    </div>
  );
}

/**
 * The link preview: Raval at work on its own headline. The headline is
 * selected, with its size, a guide along its bottom edge and the gap to each
 * side of the page measured. `title` replaces the headline for inner pages.
 */
export async function renderOg(title = 'Measure, inspect and annotate any webpage'): Promise<ImageResponse> {
  const font = (file: string): Promise<Buffer> => readFile(join(process.cwd(), 'public/fonts', file));
  // Ashbury for the words, Neue Plak (the extension's own typeface) for everything drawn as UI.
  const [ashbury, plak, plakBold] = await Promise.all([font('Ashbury-Medium.ttf'), font('Neue Plak Regular.ttf'), font('Neue Plak Text SemiBold.ttf')]);
  // Longer page titles step down so they stay inside the box.
  const size = title.length > 70 ? 48 : title.length > 46 ? 58 : 68;

  return new ImageResponse(
    (
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', background: '#F7F7F7', color: INK, fontFamily: 'Neue Plak' }}>
        {/* A guide placed on the headline's bottom edge */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: BOX.y + BOX.h - 1, height: 2, background: 'rgba(255,69,0,0.4)' }} />

        <Gap from={0} />
        <Gap from={BOX.x + BOX.w} />

        {/* The headline, selected */}
        <div style={{ position: 'absolute', left: BOX.x, top: BOX.y, width: BOX.w, height: BOX.h, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 28px', borderRadius: 8, border: `2px solid ${ACCENT}`, background: 'rgba(255,69,0,0.1)', fontFamily: 'Ashbury', fontSize: size, lineHeight: 1.08, letterSpacing: -2 }}>
          {title}
        </div>

        {/* Its width, as Annotate marks it, and its size under the pointer */}
        <div style={{ position: 'absolute', left: BOX.x, top: BOX.y - 20, width: BOX.w, height: 2, background: ACCENT }} />
        <div style={{ position: 'absolute', left: BOX.x, top: BOX.y - 28, width: 2, height: 18, background: ACCENT }} />
        <div style={{ position: 'absolute', left: BOX.x + BOX.w - 2, top: BOX.y - 28, width: 2, height: 18, background: ACCENT }} />
        <div style={{ position: 'absolute', left: BOX.x, top: BOX.y - 56, width: BOX.w, display: 'flex', justifyContent: 'center', color: ACCENT, fontSize: 18, fontWeight: 600 }}>{BOX.w}</div>
        <div style={{ ...chip, left: BOX.x, top: BOX.y + BOX.h + 14, background: '#fff', border: '1px solid rgba(0,0,0,0.1)' }}>{BOX.w} × {BOX.h}</div>
        <svg width="26" height="26" viewBox="-13 -13 26 26" style={{ position: 'absolute', left: BOX.x + BOX.w - 62, top: BOX.y + BOX.h - 50 }}>
          <path d="M-13 0h7M6 0h7M0 -13v7M0 6v7" stroke={ACCENT} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <circle r="3.6" stroke={ACCENT} strokeWidth="2.2" fill="none" />
        </svg>

        {/* Wordmark */}
        <div style={{ position: 'absolute', left: 64, top: 52, display: 'flex', alignItems: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 256 256"><path d={LOGO} fill={INK} /></svg>
          <div style={{ fontFamily: 'Ashbury', fontSize: 36, letterSpacing: -0.5, marginLeft: 14 }}>Raval</div>
        </div>

        {/* The toolbar, with Measure selected */}
        <div style={{ position: 'absolute', left: 482, top: 42, height: 56, padding: '0 10px', display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 28, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', width: 36, justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 256 256"><path d={LOGO} fill={INK} /></svg>
          </div>
          <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.1)', margin: '0 6px' }} />
          {[
            <svg key="i" {...ICON} stroke="#737373"><path d="M5 3l5.5 17 2.5-5.5L18.5 12 5 3z" /><path d="M13 14.5l4.5 4.5" /></svg>,
            <svg key="m" {...ICON} stroke={ACCENT}><rect x="2" y="8" width="20" height="8" rx="1.5" /><path d="M6 8v5M10 8v3.5M14 8v3.5M18 8v5" /></svg>,
            <svg key="g" {...ICON} stroke="#737373"><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="2.5" /></svg>,
            <svg key="a" {...ICON} stroke="#737373"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>,
          ].map((icon, i) => (
            <div key={i} style={{ width: 40, height: 40, margin: '0 2px', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i === 1 ? 'rgba(255,69,0,0.12)' : 'transparent' }}>
              {icon}
            </div>
          ))}
        </div>

        {/* Where to find it */}
        <div style={{ position: 'absolute', left: 64, bottom: 50, display: 'flex', fontSize: 22, color: MUTED }}>raval.solomonakuson.com</div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Neue Plak', data: plak, weight: 400, style: 'normal' },
        { name: 'Neue Plak', data: plakBold, weight: 600, style: 'normal' },
        { name: 'Ashbury', data: ashbury, weight: 500, style: 'normal' },
      ],
    },
  );
}
