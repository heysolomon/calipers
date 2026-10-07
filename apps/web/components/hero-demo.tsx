'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion, type MotionStyle } from 'framer-motion';

/**
 * A scripted simulation of someone using the extension, played in a mock macOS
 * browser window. Nothing here is a video: a fake cursor follows a timeline and
 * visual copies of the real UI react to it — hover states, cursor changes,
 * panels, toasts — then it loops. The interactive demo (the "View demo"
 * button) is separate and lets visitors try the tools on this page themselves.
 *
 * Everything is laid out on a fixed stage and scaled to fit, so the
 * choreography can use plain coordinates. On narrow screens the stage stops
 * shrinking at MIN_SCALE and the window shows part of it instead, panning to
 * keep the cursor in view, so the UI stays readable on a phone.
 */

const W = 640;
/** Height of the browser's title bar. */
const BAR = 38;
/** The page was laid out against a 28px bar; this shifts it under the real one. */
const SHIFT = BAR - 28;
const H = 400 + SHIFT;
/** The stage is never drawn smaller than this; below it the window crops and follows the cursor. */
const MIN_SCALE = 0.8;
/** How close the cursor may get to the window's edge before the view pans. */
const PAN_MARGIN = 96;

const ACCENT = '#FF4500';
const BLUE = '#2563EB';
const MONO = `'JetBrains Mono', 'SF Mono', ui-monospace, monospace`;
const SANS = `'Neue Plak Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
const SYSTEM = `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif`;
const BORDER = 'rgba(0, 0, 0, 0.08)';
const SHADOW_SM = '0 1px 2px rgba(0, 0, 0, 0.05), 0 2px 8px rgba(0, 0, 0, 0.04)';
const SHADOW = '0 1px 2px rgba(0, 0, 0, 0.04), 0 6px 20px rgba(0, 0, 0, 0.06)';
const SPRING = { type: 'spring', stiffness: 1000, damping: 63, mass: 1 } as const;
const EASE = [0.4, 0, 0.2, 1] as const;
const EASE_IN_OUT = [0.645, 0.045, 0.355, 1] as const;
/** Below 1 plays the whole script faster. */
const PACE = 0.78;

// ─── The mock page, in page coordinates ───────────────────────────────────────

interface Box { x: number; y: number; w: number; h: number }

const HEADING: Box = { x: 56, y: 96, w: 196, h: 34 };
const WORD: Box = { x: 201, y: 143, w: 37, h: 18 };
const CARD_A: Box = { x: 56, y: 200, w: 140, h: 112 };
const CARD_B: Box = { x: 260, y: 200, w: 140, h: 112 };
const CARD_C: Box = { x: 444, y: 96, w: 140, h: 216 };
const BOXES = { a: CARD_A, b: CARD_B, c: CARD_C } as const;
type Pin = keyof typeof BOXES;

type Mode = 'inspect' | 'measure' | 'guides' | 'annotate';
const MODES: Mode[] = ['inspect', 'measure', 'guides', 'annotate'];
/** Centres of things on the mock toolbar. */
const MODE_BTN: Record<Mode, { x: number; y: number }> = {
  inspect: { x: 267, y: 56 }, measure: { x: 293, y: 56 }, guides: { x: 319, y: 56 }, annotate: { x: 345, y: 56 },
};
const CAMERA_BTN = { x: 378, y: 56 };

// Details panel geometry, so the script can click its "Colours" header.
const PANEL = { x: WORD.x - 24, y: WORD.y + WORD.h + 8, w: 168 };
const PANEL_HEAD = 22;
const PANEL_TYPE_BODY = 63;
const COLOURS_HEADER = { x: PANEL.x + 60, y: PANEL.y + PANEL_HEAD * 2 + PANEL_TYPE_BODY + PANEL_HEAD / 2 };

// Annotate options card, under the toolbar's right end.
const TRAY: Box = { x: 268, y: 80, w: 150, h: 54 };
type Tool = 'size' | 'note' | 'arrow' | 'pen';
const TOOLS: Tool[] = ['size', 'note', 'arrow', 'pen'];
const TOOL_W = (TRAY.w - 16) / 4;
const toolBtn = (t: Tool): { x: number; y: number } => ({ x: TRAY.x + 8 + TOOL_W * (TOOLS.indexOf(t) + 0.5), y: TRAY.y + 8 + 9 });
const SWATCHES = [ACCENT, '#FF2D85', BLUE, '#16A34A', '#7C3AED', '#111111'];
const swatchAt = (i: number): { x: number; y: number } => ({ x: TRAY.x + 16 + i * 23.6, y: TRAY.y + 39 });

// Arrow endpoints and the point it is bent through.
const ARROW_FROM = { x: 500, y: 356 };
const ARROW_TO = { x: CARD_B.x + CARD_B.w - 10, y: CARD_B.y + CARD_B.h + 8 };
const ARROW_MID = { x: (ARROW_FROM.x + ARROW_TO.x) / 2, y: (ARROW_FROM.y + ARROW_TO.y) / 2 };
const ARROW_BEND = { x: ARROW_MID.x + 4, y: ARROW_MID.y + 22 };

type CursorKind = 'pointer' | 'crosshair' | 'text' | 'pen' | 'remove' | 'delete' | 'move' | 'grab';

interface Line { id: string; x1: number; x2: number; y: number }

interface Frame {
  mode: Mode;
  cursor: { x: number; y: number; kind: CursorKind; dur: number };
  clicks: number;
  hover: Box | null;
  wordHover: boolean;
  wordSelected: boolean;
  panel: false | 'type' | 'colours';
  pins: Pin[];
  lines: Line[];
  preview: { x: number; y: number; snapped: boolean; dur: number } | null;
  guideV: number | null;
  guideH: { y: number; dur: number; strong: boolean } | null;
  hint: string | null;
  tool: Tool;
  colour: string;
  arrow: false | 'straight' | 'bent';
  arrowHandles: boolean;
  note: string;
  sizeMark: boolean;
  toast: { text: string; ok: boolean } | null;
  flash: number;
  fading: boolean;
}

const START: Frame = {
  mode: 'inspect',
  cursor: { x: 520, y: 350, kind: 'crosshair', dur: 0 },
  clicks: 0,
  hover: null, wordHover: false, wordSelected: false, panel: false,
  pins: [], lines: [],
  preview: null, guideV: null, guideH: null, hint: null,
  tool: 'size', colour: ACCENT, arrow: false, arrowHandles: false, note: '', sizeMark: false,
  toast: null, flash: 0,
  fading: false,
};

const lineAB: Line = { id: 'ab', x1: CARD_A.x + CARD_A.w, x2: CARD_B.x, y: CARD_A.y + CARD_A.h / 2 };
const lineBC: Line = { id: 'bc', x1: CARD_B.x + CARD_B.w, x2: CARD_C.x, y: CARD_B.y + CARD_B.h / 2 };

/** What is shown instead of the animation when motion is reduced: a finished measurement. */
const STILL: Frame = { ...START, mode: 'measure', cursor: { x: 330, y: 268, kind: 'crosshair', dur: 0 }, pins: ['a', 'b'], lines: [lineAB] };

const NOTE_TEXT = 'Align these';

// ─── Small pieces ─────────────────────────────────────────────────────────────

const chip: CSSProperties = {
  position: 'absolute', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 5,
  boxShadow: SHADOW_SM, color: '#000', fontFamily: MONO, fontSize: 9.5, fontWeight: 500,
  letterSpacing: '-0.01em', padding: '2px 6px', whiteSpace: 'nowrap',
};

function Highlight({ box, selected }: { box: Box; selected?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: box.x, y: box.y, width: box.w, height: box.h }}
      animate={{ opacity: 1, x: box.x, y: box.y, width: box.w, height: box.h }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ ...SPRING, opacity: { duration: 0.12 } }}
      style={{
        position: 'absolute', left: 0, top: 0, boxSizing: 'border-box', borderRadius: 3,
        background: `rgba(255,69,0,${selected ? 0.14 : 0.06})`,
        border: `${selected ? 1.5 : 1}px solid rgba(255,69,0,${selected ? 1 : 0.75})`,
      }}
    />
  );
}

function Badge({ box, letter }: { box: Box; letter: string }) {
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.16, ease: 'easeOut' }}
      style={{
        position: 'absolute', left: box.x - 7, top: box.y - 7, width: 14, height: 14, borderRadius: '50%',
        background: ACCENT, border: '1.5px solid #fff', boxSizing: 'border-box', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: SANS, fontSize: 8.5, fontWeight: 600, lineHeight: 1,
      }}
    >
      {letter}
    </motion.div>
  );
}

const STROKE = 'rgba(255,69,0,0.85)';

/** Start cap, line, end cap and distance — and the line drawing back when its element is unpinned. */
function MeasureLine({ line }: { line: Line }) {
  const { x1, x2, y } = line;
  const t = (duration: number, delay: number) => ({ duration, delay, ease: EASE_IN_OUT });
  const cap = (x: number, after: number) => (
    <motion.line
      initial={{ x1: x, x2: x, y1: y, y2: y }} animate={{ y1: y - 4, y2: y + 4 }} exit={{ opacity: 0, transition: { duration: 0.08 } }}
      transition={t(0.1, after)}
    />
  );
  return (
    <>
      <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} stroke={STROKE} strokeWidth="1.5" strokeLinecap="round">
        {cap(x1, 0)}
        <motion.line
          x1={x1} y1={y} y2={y} initial={{ x2: x1 }} animate={{ x2 }} exit={{ x2: x1, transition: { duration: 0.24, ease: EASE_IN_OUT } }}
          transition={t(0.3, 0)}
        />
        {cap(x2, 0.3)}
      </svg>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.08 } }} transition={{ duration: 0.15, delay: 0.3 }}
        style={{ ...chip, left: (x1 + x2) / 2, top: y, transform: 'translate(-50%, -50%)' } as MotionStyle}
      >
        {x2 - x1}px
      </motion.div>
    </>
  );
}

const ICON = { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const MODE_ICON: Record<Mode, ReactNode> = {
  inspect:  <svg {...ICON}><path d="M5 3l5.5 17 2.5-5.5L18.5 12 5 3z" /><path d="M13 14.5l4.5 4.5" /></svg>,
  measure:  <svg {...ICON}><rect x="2" y="8" width="20" height="8" rx="1.5" /><path d="M6 8v5M10 8v3.5M14 8v3.5M18 8v5" /></svg>,
  guides:   <svg {...ICON}><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="2.5" /></svg>,
  annotate: <svg {...ICON}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>,
};

function Toolbar({ mode }: { mode: Mode }) {
  const slot: CSSProperties = { width: 24, height: 24, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
  const rule = <span style={{ width: 1, height: 12, background: BORDER, margin: '0 3px' }} />;
  return (
    <div style={{
      position: 'absolute', left: 222, top: 40, height: 32, padding: '0 5px', display: 'flex', alignItems: 'center',
      background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: SHADOW, color: '#737373',
    }}>
      <span style={{ ...slot, width: 20, color: '#000' }}>
        <svg width="11" height="11" viewBox="0 0 256 256"><path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" fill="currentColor" /></svg>
      </span>
      {rule}
      {MODES.map((m) => (
        <span key={m} style={{
          ...slot, marginRight: 2,
          background: m === mode ? 'rgba(255,69,0,0.12)' : 'transparent', color: m === mode ? ACCENT : '#737373',
          transition: 'background 0.15s ease, color 0.15s ease',
        }}>
          {MODE_ICON[m]}
        </span>
      ))}
      {rule}
      <span style={slot}><svg {...ICON}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg></span>
      <span style={slot}><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="5.5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18.5" cy="12" r="1.6" /></svg></span>
    </div>
  );
}

/** The Annotate options card: tool tabs with the sliding pill, and colour swatches. */
function Tray({ tool, colour }: { tool: Tool; colour: string }) {
  const idx = TOOLS.indexOf(tool);
  return (
    <motion.div
      initial={{ opacity: 0, y: TRAY.y - 4, scale: 0.98 }} animate={{ opacity: 1, y: TRAY.y, scale: 1 }} exit={{ opacity: 0, y: TRAY.y - 4, scale: 0.98, transition: { duration: 0.12 } }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      style={{ position: 'absolute', left: TRAY.x, top: 0, width: TRAY.w, height: TRAY.h, boxSizing: 'border-box', padding: 8, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, boxShadow: SHADOW, transformOrigin: 'top right' }}
    >
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', height: 18, background: 'rgba(0,0,0,0.05)', borderRadius: 5, padding: 1.5, boxSizing: 'border-box' }}>
        <div style={{ position: 'absolute', top: 1.5, bottom: 1.5, width: `calc((100% - 3px) / 4)`, left: `calc(1.5px + ${idx} * ((100% - 3px) / 4))`, background: '#fff', borderRadius: 4, boxShadow: '0 1px 2px rgba(0,0,0,0.08)', transition: 'left 0.22s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        {TOOLS.map((t) => (
          <span key={t} style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7.5, fontWeight: 500, color: t === tool ? '#000' : '#737373', textTransform: 'capitalize', transition: 'color 0.22s ease' }}>{t}</span>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2px', marginTop: 8 }}>
        {SWATCHES.map((c) => (
          <span key={c} style={{ position: 'relative', width: 12, height: 12 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: c, transform: 'scale(1.25)', opacity: c === colour ? 1 : 0, transition: 'opacity 0.2s ease' }} />
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#fff' }} />
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: c, transform: `scale(${c === colour ? 0.78 : 1})`, transition: 'transform 0.2s ease' }} />
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function CursorGlyph({ kind }: { kind: CursorKind }) {
  const centred: CSSProperties = { display: 'block', overflow: 'visible', marginLeft: -9, marginTop: -9 };
  if (kind === 'pointer') {
    return <svg width="16" height="18" viewBox="0 0 16 18" style={{ display: 'block' }}><path d="M1.5 1.2v13.2l3.6-3.3 2.3 5.3 2.2-.95-2.3-5.25h4.9L1.5 1.2z" fill="#000" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" /></svg>;
  }
  if (kind === 'text') {
    return <svg width="10" height="18" viewBox="-5 -9 10 18" style={{ display: 'block', marginLeft: -5, marginTop: -9 }}><path d="M-3 -8h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-2M3 -8h-2a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h2" stroke="#000" strokeWidth="1.3" fill="none" strokeLinecap="round" /></svg>;
  }
  if (kind === 'pen') {
    const d = 'M0 0L1.3 -4.4L10.2 -13.3a1.9 1.9 0 0 1 2.7 0l0.4 0.4a1.9 1.9 0 0 1 0 2.7L4.4 -1.3Z';
    return <svg width="18" height="18" viewBox="-9 -9 18 18" style={centred} strokeLinejoin="round" strokeLinecap="round"><path d={d} fill="#fff" stroke="#fff" strokeWidth="4" /><path d={d} fill="#fff" stroke={ACCENT} strokeWidth="1.5" /></svg>;
  }
  if (kind === 'remove' || kind === 'delete') {
    return (
      <svg width="18" height="18" viewBox="-9 -9 18 18" style={centred}>
        <circle r="8" fill={ACCENT} stroke="#fff" strokeWidth="1.5" />
        <path d={kind === 'remove' ? 'M-3.5 0H3.5' : 'M-2.75 -2.75L2.75 2.75M2.75 -2.75L-2.75 2.75'} stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'move') {
    const d = 'M0 -8V8M-3.2 -4.8L0 -8L3.2 -4.8M-3.2 4.8L0 8L3.2 4.8';
    return <svg width="18" height="18" viewBox="-9 -9 18 18" style={centred} fill="none" strokeLinecap="round" strokeLinejoin="round"><path d={d} stroke="#fff" strokeWidth="4.2" /><path d={d} stroke={ACCENT} strokeWidth="1.6" /></svg>;
  }
  if (kind === 'grab') {
    return <svg width="18" height="18" viewBox="-9 -9 18 18" style={centred}><circle r="6" fill="#fff" /><circle r="4.6" fill="#fff" stroke={ACCENT} strokeWidth="1.6" /></svg>;
  }
  return <svg width="18" height="18" viewBox="-9 -9 18 18" style={centred} stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" fill="none"><path d="M-9 0h5M4 0h5M0 -9v5M0 4v5" /><circle r="2.5" /></svg>;
}

function PanelRow({ label, value, swatch }: { label: string; value: string; swatch?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, height: 14 }}>
      {swatch && <span style={{ width: 9, height: 9, borderRadius: 2.5, background: swatch, border: `1px solid ${BORDER}`, flexShrink: 0 }} />}
      <span style={{ color: '#737373', fontSize: 9, flex: swatch ? 1 : undefined }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 9 }}>{value}</span>
    </div>
  );
}

function PanelSection({ title, open, summary, children }: { title: string; open?: boolean; summary?: ReactNode; children?: ReactNode }) {
  return (
    <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: PANEL_HEAD, padding: '0 9px', fontSize: 9, fontWeight: 500, boxSizing: 'border-box' }}>
        <span style={{ flex: 1 }}>{title}</span>
        <span style={{ display: 'inline-flex', opacity: open ? 0 : 1, transition: 'opacity 0.15s ease' }}>{summary}</span>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#A3A3A3" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${open ? 90 : 0}deg)`, transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}><path d="M9 6l6 6-6 6" /></svg>
      </div>
      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}>
        <div style={{ overflow: 'hidden', minHeight: 0 }}><div style={{ padding: '0 9px 7px' }}>{children}</div></div>
      </div>
    </div>
  );
}

/** Safari on macOS: traffic lights, navigation, a centred address field, and the trailing controls. */
function BrowserBar({ width }: { width: number }) {
  const glyph = { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: '#8E8E93', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  const lights: [string, string][] = [['#FF5F57', '#E0443E'], ['#FEBC2E', '#DEA123'], ['#28C840', '#1AAB29']];
  return (
    <div style={{
      position: 'absolute', left: 0, top: 0, width, height: BAR, boxSizing: 'border-box', display: 'flex', alignItems: 'center',
      padding: '0 12px', background: 'var(--hd-bar)', borderBottom: '1px solid var(--hd-bar-line)', fontFamily: SYSTEM,
    }}>
      <div style={{ display: 'flex', gap: 6.5, marginRight: 16 }}>
        {lights.map(([fill, ring]) => (
          <span key={fill} style={{ width: 10, height: 10, borderRadius: '50%', background: fill, boxShadow: `inset 0 0 0 0.5px ${ring}` }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <svg {...glyph}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M9 5v14" /></svg>
        <svg {...glyph}><path d="M15 5l-7 7 7 7" /></svg>
        <svg {...glyph} style={{ stroke: 'var(--hd-glyph-off)' }}><path d="M9 5l7 7-7 7" /></svg>
      </div>
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: Math.min(250, width - 270), height: 22, borderRadius: 7,
        background: 'var(--hd-field)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 10.5, color: 'var(--hd-bar-text)', letterSpacing: '-0.01em',
      }}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="#8E8E93"><path d="M7 10V7a5 5 0 0 1 10 0v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1zm2 0h6V7a3 3 0 0 0-6 0v3z" /></svg>
        acme.design
        <svg {...glyph} width="10" height="10" style={{ position: 'absolute', right: 7 }}><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>
      </div>
      <div style={{ display: 'flex', gap: 11, alignItems: 'center', marginLeft: 'auto' }}>
        <svg {...glyph}><path d="M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
        <svg {...glyph}><path d="M12 5v14M5 12h14" /></svg>
        <svg {...glyph}><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" /></svg>
      </div>
    </div>
  );
}

// ─── The demo ─────────────────────────────────────────────────────────────────

class Cancelled extends Error {}

export function HeroDemo() {
  const reduce = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(W);
  // Where the window sits on the stage when it is too narrow to show all of it.
  const pan = useRef(0);
  const [f, setF] = useState<Frame>(START);
  // Colours follow the theme through CSS variables; this is only for the colour value the Inspect panel prints.
  const [dark, setDark] = useState(false);
  // Only play while it can be seen: in the viewport and in a visible tab.
  const visible = useRef(false);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    const io = new IntersectionObserver(([entry]) => { visible.current = !!entry?.isIntersecting; }, { threshold: 0.35 });
    io.observe(el);
    const root = document.documentElement;
    const readTheme = (): void => setDark(root.dataset['theme'] === 'dark');
    readTheme();
    const mo = new MutationObserver(readTheme);
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { ro.disconnect(); io.disconnect(); mo.disconnect(); };
  }, []);

  useEffect(() => {
    if (reduce) { setF(STILL); return; }

    let cancelled = false;
    const patch = (p: Partial<Frame>): void => setF((prev) => ({ ...prev, ...p }));
    /** Wait `ms` of *visible* time, so the script pauses off-screen instead of running unseen. */
    const wait = async (ms: number): Promise<void> => {
      let left = ms * PACE;
      while (left > 0) {
        await new Promise((r) => setTimeout(r, 30));
        if (cancelled) throw new Cancelled();
        if (visible.current && document.visibilityState === 'visible') left -= 30;
      }
    };
    const move = async (x: number, y: number, dur: number, kind: CursorKind = 'crosshair'): Promise<void> => {
      setF((prev) => ({ ...prev, cursor: { x, y, kind, dur: dur * PACE } }));
      await wait(dur * 1000);
    };
    const look = (kind: CursorKind): void => setF((prev) => ({ ...prev, cursor: { ...prev.cursor, kind, dur: 0 } }));
    const click = async (): Promise<void> => {
      setF((prev) => ({ ...prev, clicks: prev.clicks + 1 }));
      await wait(150);
    };
    const toast = (text: string, ok = false): void => {
      patch({ toast: { text, ok } });
      setTimeout(() => { if (!cancelled) setF((prev) => (prev.toast?.text === text ? { ...prev, toast: null } : prev)); }, 1900 * PACE);
    };
    /** Hover an element the way a real pointer would: arrive, and the highlight follows. */
    const hoverOn = async (box: Box, dur: number, at: { x: number; y: number } = { x: box.w / 2, y: box.h / 2 }): Promise<void> => {
      await move(box.x + at.x, box.y + at.y, dur);
      patch({ hover: box });
      await wait(260);
    };
    /** Go up to the toolbar and pick a mode. On the controls the mode goes quiet, as in the extension. */
    const pick = async (mode: Mode): Promise<void> => {
      patch({ hover: null, wordHover: false, preview: null, hint: null });
      await move(MODE_BTN[mode].x, MODE_BTN[mode].y, 0.5, 'pointer');
      await wait(100);
      await click();
      patch({ mode, wordSelected: false, panel: false });
      await wait(260);
    };

    const run = async (): Promise<void> => {
      for (;;) {
        setF(START);
        await wait(500);

        // ── Inspect ────────────────────────────────────────────────────────────
        // Roam: the highlight glides from element to element, each with its size.
        await hoverOn(CARD_C, 0.5);
        await wait(300);
        await hoverOn(CARD_B, 0.45);
        await wait(250);
        await hoverOn(HEADING, 0.5, { x: 60, y: 18 });
        await wait(450);
        // Over text the cursor becomes an I-beam and the word takes the accent.
        await move(WORD.x + 16, WORD.y + 9, 0.4, 'text');
        patch({ hover: null, wordHover: true });
        await wait(380);
        await click();
        patch({ wordSelected: true, panel: 'type' });
        await wait(1500);
        // Open another section: the first closes, so the panel stays short.
        await move(COLOURS_HEADER.x, COLOURS_HEADER.y, 0.45, 'pointer');
        patch({ wordHover: false });
        await wait(120);
        await click();
        patch({ panel: 'colours' });
        await wait(1500);

        // ── Measure ────────────────────────────────────────────────────────────
        await pick('measure');
        await hoverOn(CARD_A, 0.5);
        await click();
        patch({ pins: ['a'], hover: null });
        toast('Click another element to measure');
        await wait(200);
        await hoverOn(CARD_B, 0.5);
        await click();
        patch({ pins: ['a', 'b'], hover: null, lines: [lineAB] });
        await wait(800);
        await hoverOn(CARD_C, 0.5, { x: 70, y: 150 });
        await click();
        patch({ pins: ['a', 'b', 'c'], hover: null, lines: [lineAB, lineBC] });
        await wait(1000);
        // Leave and come back: over a pinned element the cursor is a minus, and its size shows.
        await move(520, 352, 0.4);
        await wait(200);
        await move(CARD_C.x + 70, CARD_C.y + 130, 0.4, 'remove');
        patch({ hover: CARD_C });
        await wait(800);
        await click();
        // Unpinned: its line draws back into the element it came from.
        patch({ pins: ['a', 'b'], lines: [lineAB], hover: null });
        look('crosshair');
        await wait(900);

        // ── Guides ─────────────────────────────────────────────────────────────
        await pick('guides');
        patch({ pins: [], lines: [], preview: { x: 300, y: 130, snapped: false, dur: 0 } });
        await move(300, 130, 0.4);
        patch({ preview: { x: 110, y: 176, snapped: false, dur: 0.6 * PACE } });
        await move(110, 176, 0.6);
        // Within reach of the card's corner: both lines settle onto its edges.
        patch({ preview: { x: CARD_A.x, y: CARD_A.y, snapped: true, dur: 0.22 * PACE } });
        await move(60, 195, 0.22);
        await wait(550);
        await click();
        patch({ guideV: CARD_A.x, guideH: { y: CARD_A.y, dur: 0, strong: false }, preview: null });
        await wait(300);
        // Move off, then return to the guide: delete cursor, and a hint about what a click or a drag does.
        patch({ preview: { x: 330, y: 150, snapped: false, dur: 0.45 * PACE } });
        await move(330, 150, 0.45);
        await wait(150);
        patch({ preview: { x: 330, y: CARD_A.y, snapped: false, dur: 0.35 * PACE } });
        await move(330, CARD_A.y, 0.35);
        patch({ preview: null, hint: 'Click to delete · Drag to move', guideH: { y: CARD_A.y, dur: 0, strong: true } });
        look('delete');
        await wait(1000);
        // Drag it down; it catches the bottom edge of the cards.
        const bottom = CARD_A.y + CARD_A.h;
        patch({ hint: null, guideH: { y: bottom - 14, dur: 0.6 * PACE, strong: true } });
        await move(330, bottom - 14, 0.6, 'move');
        patch({ guideH: { y: bottom, dur: 0.2 * PACE, strong: true } });
        await move(330, bottom - 4, 0.2, 'move');
        await wait(500);
        patch({ guideH: { y: bottom, dur: 0, strong: false } });
        look('delete');
        await wait(500);

        // ── Annotate ───────────────────────────────────────────────────────────
        await pick('annotate');
        await wait(250);
        // Size callout on a card
        await hoverOn(CARD_B, 0.45);
        await click();
        patch({ sizeMark: true, hover: null });
        await wait(600);
        // Arrow tool: draw, then grab the middle and bend it
        await move(toolBtn('arrow').x, toolBtn('arrow').y, 0.4, 'pointer');
        await click();
        patch({ tool: 'arrow' });
        await wait(250);
        await move(ARROW_FROM.x, ARROW_FROM.y, 0.5);
        await wait(120);
        patch({ arrow: 'straight' });
        await move(ARROW_TO.x, ARROW_TO.y, 0.5);
        await wait(250);
        await move(ARROW_MID.x, ARROW_MID.y, 0.35, 'grab');
        patch({ arrowHandles: true });
        await wait(350);
        patch({ arrow: 'bent' });
        await move(ARROW_BEND.x, ARROW_BEND.y, 0.4, 'grab');
        await wait(450);
        // Note tool, in another colour
        patch({ arrowHandles: false });
        await move(toolBtn('note').x, toolBtn('note').y, 0.45, 'pointer');
        await click();
        patch({ tool: 'note' });
        await wait(200);
        await move(swatchAt(2).x, swatchAt(2).y, 0.3, 'pointer');
        await click();
        patch({ colour: BLUE });
        await wait(300);
        await move(504, 372, 0.45, 'pen');
        await click();
        for (let i = 1; i <= NOTE_TEXT.length; i++) {
          patch({ note: NOTE_TEXT.slice(0, i) });
          await wait(50);
        }
        await wait(500);

        // ── Screenshot ─────────────────────────────────────────────────────────
        await move(CAMERA_BTN.x, CAMERA_BTN.y, 0.5, 'pointer');
        await click();
        setF((prev) => ({ ...prev, flash: prev.flash + 1 }));
        await wait(250);
        toast('Screenshot saved', true);
        await wait(2200);

        patch({ fading: true });
        await wait(420);
      }
    };

    run().catch((err) => { if (!(err instanceof Cancelled)) throw err; });
    return () => { cancelled = true; };
  }, [reduce]);

  const onControls = f.cursor.y < 80 || (f.mode === 'annotate' && f.cursor.y < TRAY.y + TRAY.h && f.cursor.x > TRAY.x && f.cursor.x < TRAY.x + TRAY.w);
  // The curve's control point: on the line while straight, pulled out so the curve passes through the bend handle.
  const arrowCtrl = f.arrow === 'bent' ? { x: 2 * ARROW_BEND.x - ARROW_MID.x, y: 2 * ARROW_BEND.y - ARROW_MID.y } : ARROW_MID;
  const arrowPath = `M${ARROW_FROM.x} ${ARROW_FROM.y} Q${arrowCtrl.x} ${arrowCtrl.y} ${ARROW_TO.x} ${ARROW_TO.y}`;
  // The head follows the direction the curve arrives from, so it stays in line with the shaft when bent.
  const arrowBack = Math.atan2(arrowCtrl.y - ARROW_TO.y, arrowCtrl.x - ARROW_TO.x);
  const wing = (spread: number): string => `${(ARROW_TO.x + 10 * Math.cos(arrowBack + spread)).toFixed(2)} ${(ARROW_TO.y + 10 * Math.sin(arrowBack + spread)).toFixed(2)}`;
  const arrowHead = `M${wing(-0.5)} L${ARROW_TO.x} ${ARROW_TO.y} L${wing(0.5)}`;
  const guideLine = (axis: 'h' | 'v', strong: boolean, at = 0): CSSProperties => ({
    position: 'absolute', background: ACCENT, opacity: strong ? 0.85 : 0.5, transition: 'opacity 0.15s ease',
    ...(axis === 'h' ? { left: 0, right: 0, top: at, height: 1 } : { top: 28, bottom: 0, left: at, width: 1 }),
  });
  const hoverIsPinned = !!f.hover && f.pins.some((p) => BOXES[p] === f.hover);
  const textColour = dark ? '#a3a3a3' : '#5c5c5c';

  const scale = Math.max(width / W, MIN_SCALE);
  /** How much of the stage the window shows, in stage pixels. */
  const view = Math.min(W, width / scale);
  // Pan only when the cursor nears an edge, so the view holds still while it works in one place.
  const margin = Math.min(PAN_MARGIN, view / 3);
  if (f.cursor.x < pan.current + margin) pan.current = f.cursor.x - margin;
  else if (f.cursor.x > pan.current + view - margin) pan.current = f.cursor.x - view + margin;
  pan.current = Math.max(0, Math.min(W - view, pan.current));
  const panX = pan.current;

  return (
    <div
      ref={wrap}
      role="img"
      aria-label="Animated simulation of Calipers in a browser window: inspecting elements and a word, reading its typography and colours, measuring gaps between cards and unpinning one, placing a guide that snaps to edges and dragging it, annotating with a size callout, an arrow and a note, and taking a screenshot."
      // The interactive demo should not treat this picture as part of the page.
      data-demo-ui="true"
      style={{
        position: 'relative', width: '100%', height: H * scale, overflow: 'hidden',
        borderRadius: 10 * scale, border: '1px solid var(--hd-edge)', background: 'var(--hd-page)',
        boxShadow: '0 18px 44px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.05)',
        userSelect: 'none', pointerEvents: 'none',
      }}
    >
      <div aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, width: view, height: H, transform: `scale(${scale})`, transformOrigin: '0 0', fontFamily: SANS,
        // The stage sets its own type; it must not pick up the page's body size, leading or tracking.
        fontSize: 16, lineHeight: 1.5, letterSpacing: 'normal', textAlign: 'left',
        // Calipers' own UI is light in both themes, so its text is always dark; the mock page sets its own colours.
        color: '#000',
      }}>
        <BrowserBar width={view} />

        {/* Everything below the bar; coordinates inside are page coordinates */}
        <motion.div
          initial={false} animate={{ x: -panX }} transition={{ duration: reduce ? 0 : Math.max(f.cursor.dur, 0.3), ease: EASE }}
          style={{ position: 'absolute', left: 0, top: SHIFT, width: W, height: H - SHIFT, opacity: f.fading ? 0 : 1, transition: 'opacity 0.4s ease' }}
        >
          {/* The page being worked on */}
          <div style={{ position: 'absolute', left: HEADING.x, top: HEADING.y, width: HEADING.w, height: HEADING.h, fontFamily: '"Ashbury", Georgia, serif', fontSize: 27, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: `${HEADING.h}px`, color: 'var(--hd-ink)' }}>
            Simple pricing
          </div>
          <div style={{ position: 'absolute', left: 56, top: 143, width: 320, fontSize: 12.5, lineHeight: '18px', color: 'var(--hd-ink-2)', whiteSpace: 'nowrap' }}>
            Start free, then pay as your{' '}
            <span style={{
              // Positioned so its box matches WORD, whatever the font metrics do.
              position: 'absolute', left: WORD.x - 56, top: 0, width: WORD.w, height: WORD.h, textAlign: 'center',
              background: f.wordHover || f.wordSelected ? ACCENT : 'transparent', color: f.wordHover || f.wordSelected ? '#fff' : 'inherit',
              boxShadow: f.wordHover || f.wordSelected ? `0 0 0 1.5px ${ACCENT}` : 'none', borderRadius: 3,
            }}>
              team
            </span>
            <span style={{ position: 'absolute', left: WORD.x - 56 + WORD.w + 4, top: 0 }}>grows.</span>
          </div>
          {[CARD_A, CARD_B].map((c, i) => (
            <div key={i} style={{ position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h, boxSizing: 'border-box', borderRadius: 8, border: '1px solid var(--hd-card-line)', background: 'var(--hd-card)', padding: 12 }}>
              <div style={{ fontSize: 9, color: '#A3A3A3', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{i === 0 ? 'Starter' : 'Team'}</div>
              <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.03em', margin: '5px 0 9px', color: 'var(--hd-ink)' }}>{i === 0 ? '$0' : '$12'}</div>
              <div style={{ height: 5, width: '80%', borderRadius: 3, background: 'var(--hd-fill)', marginBottom: 5 }} />
              <div style={{ height: 5, width: '55%', borderRadius: 3, background: 'var(--hd-fill)' }} />
            </div>
          ))}
          <div style={{ position: 'absolute', left: CARD_C.x, top: CARD_C.y, width: CARD_C.w, height: CARD_C.h, boxSizing: 'border-box', borderRadius: 8, background: 'var(--hd-block)' }} />

          {/* ── Calipers, drawn over the page ── */}

          {/* Guides */}
          {f.guideV !== null && <div style={guideLine('v', false, f.guideV)} />}
          {f.guideH && (
            <motion.div initial={false} animate={{ y: f.guideH.y }} transition={{ duration: f.guideH.dur, ease: EASE }} style={guideLine('h', f.guideH.strong) as MotionStyle} />
          )}
          {f.preview && (
            <>
              <motion.div initial={false} animate={{ y: f.preview.y }} transition={{ duration: f.preview.dur, ease: EASE }} style={guideLine('h', f.preview.snapped) as MotionStyle} />
              <motion.div initial={false} animate={{ x: f.preview.x }} transition={{ duration: f.preview.dur, ease: EASE }} style={guideLine('v', f.preview.snapped) as MotionStyle} />
            </>
          )}
          {f.hint && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} style={{ ...chip, fontFamily: SANS, color: '#737373', left: f.cursor.x + 14, top: f.cursor.y + 14 } as MotionStyle}>
              {f.hint}
            </motion.div>
          )}

          {/* Measure: pinned elements and the lines between them */}
          <AnimatePresence>
            {f.pins.map((p) => <Highlight key={p} box={BOXES[p]} selected />)}
          </AnimatePresence>
          <AnimatePresence>
            {f.lines.map((l) => <MeasureLine key={l.id} line={l} />)}
          </AnimatePresence>
          <AnimatePresence>
            {f.pins.map((p) => <Badge key={p} box={BOXES[p]} letter={p.toUpperCase()} />)}
          </AnimatePresence>

          {/* Hover highlight and the size of what is under the pointer */}
          <AnimatePresence>
            {f.hover && !hoverIsPinned && <Highlight key="hover" box={f.hover} />}
          </AnimatePresence>
          {f.hover && <div style={{ ...chip, left: f.hover.x + (hoverIsPinned ? 12 : 0), top: f.hover.y - 22 }}>{f.hover.w} × {f.hover.h}</div>}

          {/* Annotate */}
          {f.sizeMark && (
            <motion.svg initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
              <rect x={CARD_B.x} y={CARD_B.y} width={CARD_B.w} height={CARD_B.h} rx="2" fill="rgba(255,69,0,0.12)" stroke={ACCENT} strokeWidth="1.5" />
              <path d={`M${CARD_B.x} ${CARD_B.y - 10}H${CARD_B.x + CARD_B.w}M${CARD_B.x} ${CARD_B.y - 13}v6M${CARD_B.x + CARD_B.w} ${CARD_B.y - 13}v6`} stroke={ACCENT} strokeWidth="1.2" strokeLinecap="round" />
              <text x={CARD_B.x + CARD_B.w / 2} y={CARD_B.y - 14} textAnchor="middle" fill={ACCENT} fontFamily={MONO} fontSize="9" fontWeight="600">{CARD_B.w}</text>
            </motion.svg>
          )}
          {f.arrow && (
            <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <motion.path initial={{ pathLength: 0, d: arrowPath }} animate={{ pathLength: 1, d: arrowPath }} transition={{ pathLength: { duration: 0.5 * PACE, ease: EASE }, d: { duration: 0.4 * PACE, ease: EASE } }} />
              <motion.path
                initial={{ opacity: 0, d: arrowHead }} animate={{ opacity: 1, d: arrowHead }}
                transition={{ opacity: { duration: 0.1, delay: 0.42 * PACE }, d: { duration: 0.4 * PACE, ease: EASE } }}
              />
              {f.arrowHandles && [ARROW_FROM, ARROW_TO, f.arrow === 'bent' ? ARROW_BEND : ARROW_MID].map((p, i) => (
                <motion.circle key={i} r={i === 2 ? 3 : 3.6} fill={i === 2 && f.arrow === 'bent' ? ACCENT : '#fff'} strokeWidth="1.3" initial={false} animate={{ cx: p.x, cy: p.y }} transition={{ duration: 0.4 * PACE, ease: EASE }} />
              ))}
            </svg>
          )}
          {f.note && (
            <div style={{ position: 'absolute', left: 508, top: 352, color: BLUE, fontFamily: '"Caveat", "Bradley Hand", "Segoe Print", cursive', fontSize: 16, fontWeight: 600, transform: 'rotate(-1.5deg)', whiteSpace: 'nowrap', textShadow: 'var(--hd-note-shadow)' }}>
              {f.note}
            </div>
          )}

          {/* Inspect details */}
          <AnimatePresence>
            {f.panel && (
              <motion.div
                key="panel"
                initial={{ opacity: 0, y: PANEL.y - 4, scale: 0.98 }} animate={{ opacity: 1, y: PANEL.y, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.16, ease: 'easeOut' }}
                style={{ position: 'absolute', left: PANEL.x, top: 0, width: PANEL.w, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, boxShadow: SHADOW, overflow: 'hidden', transformOrigin: 'top left' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: PANEL_HEAD, padding: '0 9px', fontFamily: MONO, fontSize: 9, boxSizing: 'border-box' }}>
                  <span style={{ color: '#737373' }}>&lt;p&gt;</span><span>320 × 18</span>
                </div>
                <PanelSection title="Typography" open={f.panel === 'type'} summary={<span style={{ color: '#A3A3A3', fontWeight: 400 }}>Neue Plak</span>}>
                  <PanelRow label="Font" value="Neue Plak" />
                  <PanelRow label="Size" value="12.5px" />
                  <PanelRow label="Weight" value="400 Regular" />
                  <PanelRow label="Line height" value="18px / 1.44" />
                </PanelSection>
                <PanelSection title="Colours" open={f.panel === 'colours'} summary={<span style={{ width: 8, height: 8, borderRadius: '50%', background: textColour, border: `1px solid ${BORDER}` }} />}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', height: 16, background: 'rgba(0,0,0,0.05)', borderRadius: 5, padding: 1.5, boxSizing: 'border-box', marginBottom: 5, fontSize: 7.5, fontWeight: 500 }}>
                    {['HEX', 'RGB', 'HSL'].map((t, i) => (
                      <span key={t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, background: i === 0 ? '#fff' : 'transparent', boxShadow: i === 0 ? '0 1px 2px rgba(0,0,0,0.08)' : 'none', color: i === 0 ? '#000' : '#737373' }}>{t}</span>
                    ))}
                  </div>
                  <PanelRow label="Color" value={textColour} swatch={textColour} />
                </PanelSection>
                <PanelSection title="Box" />
              </motion.div>
            )}
          </AnimatePresence>

          <Toolbar mode={f.mode} />
          <AnimatePresence>{f.mode === 'annotate' && <Tray key="tray" tool={f.tool} colour={f.colour} />}</AnimatePresence>

          {/* Toast */}
          <AnimatePresence>
            {f.toast && (
              <motion.div
                key={f.toast.text}
                initial={{ opacity: 0, y: 14, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 14, x: '-50%' }} transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ position: 'absolute', left: panX + view / 2, bottom: 14, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 9px', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 7, boxShadow: SHADOW_SM, fontSize: 9.5, fontWeight: 500, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}
              >
                {f.toast.ok && <svg width="10" height="10" viewBox="0 0 20 20" fill="#16a34a"><path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" /></svg>}
                {f.toast.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Screenshot flash */}
          {f.flash > 0 && (
            <motion.div key={f.flash} initial={{ opacity: 0.7 }} animate={{ opacity: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }} style={{ position: 'absolute', inset: '28px 0 0 0', background: '#fff' }} />
          )}

          {/* The cursor, with a ring on each click */}
          <motion.div
            animate={{ x: f.cursor.x, y: f.cursor.y }} transition={{ duration: f.cursor.dur, ease: EASE }}
            style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0 }}
          >
            {f.clicks > 0 && (
              <motion.span
                key={f.clicks}
                initial={{ opacity: 0.5, scale: 0.4 }} animate={{ opacity: 0, scale: 1.6 }} transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{ position: 'absolute', left: -9, top: -9, width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${ACCENT}`, boxSizing: 'border-box' }}
              />
            )}
            <CursorGlyph kind={onControls ? 'pointer' : f.cursor.kind} />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
