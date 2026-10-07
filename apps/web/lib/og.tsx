import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CSSProperties, ReactNode } from 'react';
import { ImageResponse } from 'next/og';

/** The size every platform expects for a link preview. */
export const OG_SIZE = { width: 1200, height: 630 } as const;

const ACCENT = '#FF4500';
const BLUE = '#2F6BFF';
const INK = '#000000';
const LINE = '#dedede';
const SOFT = 'rgba(6,6,6,0.08)';

const LOGO = 'M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z';

// ─── Layout ───────────────────────────────────────────────────────────────────
// Words on the left, the homepage's six tiles on the right.

const PAD = 64;
const WORDS = 496;
const FRAME_W = OG_SIZE.width - PAD * 2 - WORDS - 44;
/** Tiles keep the homepage's proportions (278 : 233), so the frame is as tall as two of them. */
const CELL_W = (FRAME_W - 2) / 3;
const CELL = { w: CELL_W, h: (CELL_W - 10) * (233 / 278) + 10 };
const FRAME = { w: FRAME_W, h: CELL.h * 2 + 2 };
const CARD = { w: CELL.w - 10, h: CELL.h - 10 };
/** Each drawing is laid out on the same 200 × 96 grid as the website's tiles, then scaled to the card. */
const ART_W = CARD.w - 24;
const K = ART_W / 200;
const ART_TOP = (CARD.h - 30 - 96 * K) / 2;

const block = { fill: 'rgba(0,0,0,0.04)', stroke: 'rgba(0,0,0,0.1)' } as const;

/** Text placed on a drawing, in the drawing's own coordinates (the image renderer has no SVG text). */
function Label({ x, y, w, h, children, style }: { x: number; y: number; w: number; h: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: 'absolute', left: 12 + x * K, top: ART_TOP + y * K, width: w * K, height: h * K, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8.6 * K, fontWeight: 600, ...style }}>
      {children}
    </div>
  );
}

const chipStyle: CSSProperties = { background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 5 * K };

// Lists rather than fragments: the image renderer does not accept fragments.
const TILES: { name: string; hint: string; art: ReactNode[]; labels: ReactNode[] }[] = [
  {
    name: 'Inspect', hint: '1',
    art: [
        <rect key="k0" x="40" y="18" width="120" height="44" rx="3" fill="rgba(255,69,0,0.12)" stroke={ACCENT} />,
        <rect key="k1" x="52" y="30" width="56" height="6" rx="3" fill="rgba(0,0,0,0.16)" />,
        <rect key="k2" x="52" y="43" width="84" height="6" rx="3" fill="rgba(0,0,0,0.08)" />,
      ],
    labels: [<Label key="k0" x={72} y={70} w={56} h={16} style={chipStyle}>240 × 88</Label>],
  },
  {
    name: 'Measure', hint: '2',
    art: [
        <rect key="k0" x="22" y="26" width="54" height="44" rx="3" fill="rgba(255,69,0,0.12)" stroke={ACCENT} />,
        <rect key="k1" x="124" y="26" width="54" height="44" rx="3" fill="rgba(255,69,0,0.12)" stroke={ACCENT} />,
        <path key="k2" d="M76 48h48M76 44v8M124 44v8" stroke={ACCENT} />,
      ],
    labels: [
        <Label key="k0" x={88} y={29} w={24} h={14} style={{ background: ACCENT, color: '#fff', borderRadius: 4 * K }}>48</Label>,
        <Label key="k1" x={15} y={19} w={14} h={14} style={{ background: ACCENT, color: '#fff', borderRadius: 7 * K }}>A</Label>,
        <Label key="k2" x={117} y={19} w={14} h={14} style={{ background: ACCENT, color: '#fff', borderRadius: 7 * K }}>B</Label>,
      ],
  },
  {
    name: 'Guides', hint: '3',
    art: [
        <rect key="k0" x="58" y="28" width="84" height="40" rx="3" {...block} />,
        <path key="k1" d="M58 0v96M0 28h200" stroke={ACCENT} />,
        <path key="k2" d="M142 0v96" stroke={ACCENT} strokeOpacity="0.4" strokeDasharray="3 3" />,
      ],
    labels: [<Label key="k0" x={146} y={76} w={30} h={14} style={chipStyle}>142</Label>],
  },
  {
    name: 'Annotate', hint: '4',
    art: [
        <rect key="k0" x="24" y="44" width="70" height="34" rx="3" {...block} />,
        <path key="k1" d="M150 30C132 22 112 30 100 46" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />,
        <path key="k2" d="M100 46l1.5-9M100 46l9-2" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />,
      ],
    labels: [<Label key="k0" x={116} y={42} w={70} h={14} style={{ color: BLUE, fontSize: 10.5 * K, fontWeight: 400, justifyContent: 'flex-start' }}>more space</Label>],
  },
  {
    name: 'Screenshot', hint: 'S',
    art: [
        <rect key="k0" x="30" y="20" width="62" height="20" rx="3" {...block} />,
        <rect key="k1" x="30" y="48" width="100" height="28" rx="3" {...block} />,
        <rect key="k2" x="20" y="10" width="124" height="76" stroke={INK} strokeDasharray="4 3" />,
        ...[[20, 10], [144, 10], [20, 86], [144, 86]].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x! - 2.5} y={y! - 2.5} width="5" height="5" fill="#fff" stroke={INK} />
        )),
      ],
    labels: [<Label key="k0" x={148} y={84} w={50} h={12} style={{ color: '#737373', fontWeight: 400, justifyContent: 'flex-start' }}>124 × 76</Label>],
  },
  {
    name: 'Design tokens', hint: 'D',
    art: [
        ...[ACCENT, '#000000', '#737373', '#F7F7F7'].map((fill, i) => (
          <rect key={fill} x="34" y={14 + i * 20} width="10" height="10" rx="2" fill={fill} stroke="rgba(128,128,128,0.35)" />
        )),
      ],
    labels: [
        ...[['--accent', '#FF4500'], ['--text', '#000000'], ['--muted', '#737373'], ['--surface', '#F7F7F7']].map(([name, value], i) => (
          <Label key={name} x={52} y={13 + i * 20} w={114} h={12} style={{ justifyContent: 'space-between', fontWeight: 400 }}>
            <div style={{ display: 'flex', fontWeight: 600 }}>{name}</div>
            <div style={{ display: 'flex', color: '#737373' }}>{value}</div>
          </Label>
        )),
      ],
  },
];

/**
 * The link preview: the logo and headline on the left, and on the right the
 * same six tiles as the homepage (Inspect, Measure, Guides, Annotate,
 * Screenshot, Design tokens), drawn here rather than screenshotted.
 * `title` replaces the headline for inner pages.
 */
export async function renderOg(title = 'Measure, inspect and annotate any webpage'): Promise<ImageResponse> {
  const font = (file: string): Promise<Buffer> => readFile(join(process.cwd(), 'public/fonts', file));
  // Ashbury for the words, Neue Plak (the extension's own typeface) for everything drawn as UI.
  const [ashbury, plak, plakBold] = await Promise.all([font('Ashbury-Medium.ttf'), font('Neue Plak Regular.ttf'), font('Neue Plak Text SemiBold.ttf')]);
  // Longer page titles step down so they still fit the column.
  const size = title.length > 60 ? 34 : title.length > 42 ? 38 : 42;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'space-between', background: '#F7F7F7', color: INK, padding: PAD, fontFamily: 'Neue Plak' }}>
        {/* Words */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: WORDS }}>
          <svg width="40" height="40" viewBox="0 0 256 256"><path d={LOGO} fill={INK} /></svg>
          <div style={{ fontFamily: 'Ashbury', fontSize: size, lineHeight: 1.06, letterSpacing: -1.6 }}>{title}</div>
        </div>

        {/* The six tiles */}
        <div style={{ display: 'flex', flexWrap: 'wrap', width: FRAME.w, height: FRAME.h, alignSelf: 'center', border: `1px solid ${LINE}`, borderRadius: 22 }}>
          {TILES.map(({ name, hint, art, labels }, i) => (
            <div
              key={name}
              style={{
                display: 'flex', width: CELL.w, height: CELL.h, padding: 5,
                borderLeft: i % 3 === 0 ? 'none' : `1px dashed ${LINE}`,
                borderTop: i < 3 ? 'none' : `1px dashed ${LINE}`,
              }}
            >
              <div style={{ position: 'relative', display: 'flex', flex: 1, background: '#fff', border: `1px solid ${SOFT}`, borderRadius: 16, boxShadow: '0 2px 1px rgba(6,6,6,0.05)' }}>
                <svg width={ART_W} height={96 * K} viewBox="0 0 200 96" fill="none" style={{ position: 'absolute', left: 12, top: ART_TOP }}>
                  {art}
                </svg>
                {labels}
                <div style={{ position: 'absolute', left: 14, right: 14, bottom: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: '#424242' }}>
                  <div style={{ display: 'flex' }}>{name}</div>
                  <div style={{ display: 'flex', color: '#121212' }}>{hint}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
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
