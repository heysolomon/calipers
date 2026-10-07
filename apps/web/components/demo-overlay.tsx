'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion, type MotionStyle } from 'framer-motion';
import { useDemo, type DemoCursor } from './demo-provider';

// The demo mirrors the extension: same colours, same highlight states, same
// motion. Values here are kept in step with apps/extension/src/content/tokens.ts
// and motion.ts.

const UI = {
  font: `'Neue Plak Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  mono: `'JetBrains Mono', 'SF Mono', ui-monospace, monospace`,
  bg: '#ffffff',
  track: 'rgba(0, 0, 0, 0.05)',
  hover: 'rgba(0, 0, 0, 0.04)',
  border: 'rgba(0, 0, 0, 0.08)',
  borderSubtle: 'rgba(0, 0, 0, 0.06)',
  textPrimary: '#000000',
  textSecondary: '#737373',
  textMuted: '#A3A3A3',
  accent: '#FF4500',
  shadow: '0 1px 2px rgba(0, 0, 0, 0.04), 0 6px 20px rgba(0, 0, 0, 0.06)',
  shadowSm: '0 1px 2px rgba(0, 0, 0, 0.05), 0 2px 8px rgba(0, 0, 0, 0.04)',
  shadowPill: '0 1px 2px rgba(0, 0, 0, 0.08)',
  easeMove: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
} as const;

/** The hover spring: near-critically damped, quick, no bounce. */
const SPRING = { type: 'spring', stiffness: 1000, damping: 63, mass: 1 } as const;
const TOOLBAR_H = 44;

// ─── Shared helpers ───────────────────────────────────────────────────────────

function isOurUI(el: Element | null): boolean {
  return !!el?.closest?.('[data-demo-ui="true"]');
}

function getTarget(x: number, y: number): Element | null {
  const el = document.elementFromPoint(x, y);
  if (!el || isOurUI(el) || el === document.body || el === document.documentElement) return null;
  return el;
}

interface Box { x: number; y: number; w: number; h: number }

function toBox(r: DOMRect): Box {
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

const dims = (r: { width: number; height: number }): string =>
  `${Math.round(r.width)} × ${Math.round(r.height)}`;

let lastScrollAt = 0;

/** Re-render on scroll and resize so anything anchored to the page stays put. */
function useViewportTick(): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = (): void => { lastScrollAt = performance.now(); setTick((t) => t + 1); };
    window.addEventListener('scroll', bump, { passive: true, capture: true });
    window.addEventListener('resize', bump);
    return () => {
      window.removeEventListener('scroll', bump, { capture: true });
      window.removeEventListener('resize', bump);
    };
  }, []);
}

/** While the page is scrolling, boxes track it exactly instead of springing after it. */
function useMove(): typeof SPRING | { duration: 0 } {
  const reduce = useReducedMotion();
  return reduce || performance.now() - lastScrollAt < 120 ? { duration: 0 } : SPRING;
}

// ─── Shared pieces ────────────────────────────────────────────────────────────

/**
 * The one element highlight every tool uses. Hover: soft fill, thin border.
 * Selected: same shape, darker fill and a solid, heavier border. It springs
 * between targets instead of jumping.
 */
function ElementHighlight({ box, selected = false, outline = false, z = 8900 }: {
  box: Box;
  selected?: boolean;
  /** Text targets: the word is filled by the browser highlight, so only outline it. */
  outline?: boolean;
  z?: number;
}) {
  const move = useMove();
  const fill = outline ? 0 : selected ? 0.14 : 0.06;
  const stroke = selected ? 1 : 0.75;
  return (
    <motion.div
      data-demo-ui="true"
      initial={{ opacity: 0, x: box.x, y: box.y, width: box.w, height: box.h }}
      animate={{ opacity: 1, x: box.x, y: box.y, width: box.w, height: box.h }}
      transition={{ ...move, opacity: { duration: 0.12, ease: 'easeOut' } }}
      style={{
        position: 'fixed', left: 0, top: 0, boxSizing: 'border-box',
        background: `rgba(255,69,0,${fill})`,
        border: `${selected || outline ? 1.5 : 1}px solid rgba(255,69,0,${stroke})`,
        borderRadius: outline ? 3 : 2,
        pointerEvents: 'none', zIndex: z,
      }}
    />
  );
}

const CHIP: CSSProperties = {
  position: 'fixed',
  background: UI.bg,
  border: `1px solid ${UI.border}`,
  borderRadius: 6,
  boxShadow: UI.shadowSm,
  color: UI.textPrimary,
  fontFamily: UI.mono,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '-0.01em',
  padding: '3px 8px',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  zIndex: 8960,
};

function Chip({ x, y, children, centered = false, style }: {
  x: number; y: number; children: ReactNode; centered?: boolean; style?: CSSProperties;
}) {
  return (
    <div
      data-demo-ui="true"
      style={{ ...CHIP, left: x, top: y, transform: centered ? 'translate(-50%, -50%)' : undefined, ...style }}
    >
      {children}
    </div>
  );
}

// ─── 1. Inspect ───────────────────────────────────────────────────────────────
// Hover outlines what is under the pointer; click opens its details.

interface TextHit { range: Range; el: Element }

const WORD = /\S/;

/** The word of rendered text under a point, if any. */
function wordAt(x: number, y: number): TextHit | null {
  const caret = document.caretRangeFromPoint?.(x, y);
  const node = caret?.startContainer;
  if (!caret || !node || node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent ?? '';
  const parent = node.parentElement;
  if (!parent || !text.trim() || isOurUI(parent)) return null;

  let start = caret.startOffset;
  let end = start;
  while (start > 0 && WORD.test(text[start - 1] ?? '')) start--;
  while (end < text.length && WORD.test(text[end] ?? '')) end++;
  if (start === end) return null;

  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const r = range.getBoundingClientRect();
  if (r.width === 0 || x < r.left - 3 || x > r.right + 3 || y < r.top - 3 || y > r.bottom + 3) return null;
  return { range, el: parent };
}

function sameRange(a: Range | null | undefined, b: Range | null | undefined): boolean {
  if (!a || !b) return a === b;
  return a.startContainer === b.startContainer && a.startOffset === b.startOffset
    && a.endContainer === b.endContainer && a.endOffset === b.endOffset;
}

const HIGHLIGHT_NAME = 'calipers-demo-text';

/** Fill the hovered and selected words with the accent and turn their glyphs white, like a text selection. */
function useTextHighlight(ranges: (Range | null | undefined)[]): void {
  useEffect(() => {
    if (typeof CSS === 'undefined' || !('highlights' in CSS)) return;
    const live = ranges.filter((r): r is Range => !!r);
    if (live.length === 0) CSS.highlights.delete(HIGHLIGHT_NAME);
    else CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...live));
  });
  useEffect(() => () => {
    if (typeof CSS !== 'undefined' && 'highlights' in CSS) CSS.highlights.delete(HIGHLIGHT_NAME);
  }, []);
}

interface Prop { label: string; value: string }
interface Colour { label: string; raw: string; hex: string; rgb: string; hsl: string }
type Format = 'hex' | 'rgb' | 'hsl';
const FORMATS: Format[] = ['hex', 'rgb', 'hsl'];

const num = (n: number, digits = 3): string => String(Number(n.toFixed(digits)));

function parseRgba(css: string): [number, number, number, number] | null {
  const m = css.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,/\s]+([\d.]+))?\s*\)/);
  if (!m) return null;
  const a = m[4] !== undefined ? Number(m[4]) : 1;
  return [Number(m[1]), Number(m[2]), Number(m[3]), a > 1 ? a / 100 : a];
}

function toHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rn ? ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
    : max === gn ? ((bn - rn) / d + 2) / 6 : ((rn - gn) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function readColours(el: Element, textFirst: boolean): Colour[] {
  const css = window.getComputedStyle(el);
  const text: [string, string] = ['Color', css.color];
  const bg: [string, string] = ['Background', css.backgroundColor];
  const out: Colour[] = [];
  const seen = new Set<string>();
  for (const [label, raw] of [...(textFirst ? [text, bg] : [bg, text]), ['Border', css.borderTopColor] as [string, string]]) {
    const p = parseRgba(raw);
    if (!p || p[3] < 0.05) continue;
    const [r, g, b] = p;
    const hex = '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
    if (seen.has(hex)) continue;
    seen.add(hex);
    const [h, s, l] = toHsl(r, g, b);
    out.push({ label, raw, hex, rgb: `rgb(${r}, ${g}, ${b})`, hsl: `hsl(${h}, ${s}%, ${l}%)` });
  }
  return out;
}

const WEIGHTS: Record<string, string> = {
  '100': 'Thin', '200': 'Extra Light', '300': 'Light', '400': 'Regular', '500': 'Medium',
  '600': 'Semibold', '700': 'Bold', '800': 'Extra Bold', '900': 'Black',
};

function readTypography(el: Element): Prop[] {
  const css = window.getComputedStyle(el);
  const size = parseFloat(css.fontSize) || 0;
  const family = (css.fontFamily.split(',')[0] ?? '').trim().replace(/^["']|["']$/g, '');
  const lh = parseFloat(css.lineHeight);
  const ls = parseFloat(css.letterSpacing);
  return [
    { label: 'Font', value: family },
    { label: 'Size', value: `${num(size)}px` },
    { label: 'Weight', value: WEIGHTS[css.fontWeight] ? `${css.fontWeight} ${WEIGHTS[css.fontWeight]}` : css.fontWeight },
    { label: 'Line height', value: Number.isNaN(lh) || !size ? css.lineHeight : `${num(lh)}px / ${num(lh / size)}` },
    { label: 'Letter spacing', value: Number.isNaN(ls) || ls === 0 || !size ? '0' : `${num(ls)}px / ${num(ls / size)}em` },
  ];
}

function shorthand(t: number, r: number, b: number, l: number): string {
  const px = (n: number): string => (n === 0 ? '0' : `${num(n, 2)}px`);
  if (t === r && r === b && b === l) return px(t);
  if (t === b && r === l) return `${px(t)} ${px(r)}`;
  if (r === l) return `${px(t)} ${px(r)} ${px(b)}`;
  return `${px(t)} ${px(r)} ${px(b)} ${px(l)}`;
}

function readBox(el: Element): Prop[] {
  const css = window.getComputedStyle(el);
  const n = (v: string): number => parseFloat(v) || 0;
  const out: Prop[] = [
    { label: 'Margin', value: shorthand(n(css.marginTop), n(css.marginRight), n(css.marginBottom), n(css.marginLeft)) },
    { label: 'Border', value: shorthand(n(css.borderTopWidth), n(css.borderRightWidth), n(css.borderBottomWidth), n(css.borderLeftWidth)) },
    { label: 'Padding', value: shorthand(n(css.paddingTop), n(css.paddingRight), n(css.paddingBottom), n(css.paddingLeft)) },
  ];
  if (css.borderRadius && css.borderRadius !== '0px') out.push({ label: 'Radius', value: css.borderRadius });
  return out;
}

const rowBase: CSSProperties = {
  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12,
  padding: '5px 6px', margin: '0 -6px', borderRadius: 6,
};
const rowLabel: CSSProperties = { color: UI.textSecondary, fontSize: 11, letterSpacing: '-0.01em', flexShrink: 0 };
const rowValue: CSSProperties = {
  color: UI.textPrimary, fontFamily: UI.mono, fontSize: 11, letterSpacing: '-0.01em',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, textAlign: 'right',
};

function PropRow({ label, value, swatch }: Prop & { swatch?: string }) {
  return (
    <div className="demo-row" style={{ ...rowBase, alignItems: swatch ? 'center' : 'baseline' }}>
      {swatch && (
        <span style={{ width: 14, height: 14, borderRadius: 4, flexShrink: 0, background: swatch, border: `1px solid ${UI.border}` }} />
      )}
      <span style={{ ...rowLabel, flex: swatch ? 1 : undefined }}>{label}</span>
      <span style={rowValue}>{value}</span>
    </div>
  );
}

type SectionKey = 'type' | 'colours' | 'box';

/** Collapsible group; the body opens with a grid row so no heights are measured. */
function Section({ title, open, onToggle, summary, children }: {
  title: string; open: boolean; onToggle: () => void; summary?: ReactNode; children: ReactNode;
}) {
  return (
    <div style={{ borderTop: `1px solid ${UI.borderSubtle}` }}>
      <button
        type="button"
        className="demo-row"
        aria-expanded={open}
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%', boxSizing: 'border-box',
          padding: '9px 12px', margin: 0, border: 'none', background: 'transparent', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 11, fontWeight: 500, letterSpacing: '-0.01em',
          color: UI.textPrimary, textAlign: 'left',
        }}
      >
        <span style={{ flex: 1 }}>{title}</span>
        {/* A closed section previews what is inside */}
        {summary && <span style={{ opacity: open ? 0 : 1, transition: 'opacity 0.15s ease', display: 'inline-flex' }}>{summary}</span>}
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={UI.textMuted} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          style={{ transform: `rotate(${open ? 90 : 0}deg)`, transition: `transform 0.2s ${UI.easeMove}` }}
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: `grid-template-rows 0.2s ${UI.easeOut}` }}>
        <div style={{ overflow: 'hidden', minHeight: 0 }}>
          <div style={{ padding: '0 12px 10px' }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Tab row with a pill that slides to the active item. */
function Segmented({ value, onChange }: { value: Format; onChange: (f: Format) => void }) {
  const idx = FORMATS.indexOf(value);
  return (
    <div style={{
      position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
      background: UI.track, borderRadius: 7, padding: 2, marginBottom: 6,
    }}>
      <div style={{
        position: 'absolute', top: 2, bottom: 2, width: 'calc((100% - 4px) / 3)',
        left: `calc(2px + ${idx} * ((100% - 4px) / 3))`,
        background: UI.bg, borderRadius: 5, boxShadow: UI.shadowPill,
        transition: `left 0.22s ${UI.easeMove}`,
      }} />
      {FORMATS.map((f) => (
        <button
          key={f} type="button" aria-pressed={f === value} onClick={() => onChange(f)}
          style={{
            position: 'relative', zIndex: 1, height: 24, padding: 0, border: 'none', background: 'transparent',
            color: f === value ? UI.textPrimary : UI.textSecondary, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 10, fontWeight: 500, letterSpacing: '-0.01em',
            transition: `color 0.22s ${UI.easeMove}`,
          }}
        >
          {f.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

const PANEL_W = 248;

interface Selection { el: Element; range: Range | null }

function DetailsPanel({ sel, anchor }: { sel: Selection; anchor: DOMRect }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = useMove();
  const [format, setFormat] = useState<Format>('hex');
  // One section open at a time: typography for text, colours otherwise.
  const [open, setOpen] = useState<SectionKey | null>(null);
  const [height, setHeight] = useState(220);

  const type = useMemo(() => (sel.range ? readTypography(sel.el) : []), [sel]);
  const colours = useMemo(() => readColours(sel.el, !!sel.range), [sel]);
  const box = useMemo(() => readBox(sel.el), [sel]);

  useEffect(() => { setOpen(sel.range ? 'type' : 'colours'); }, [sel]);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(() => setHeight(ref.current?.offsetHeight ?? 220));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  // Below, else above, else beside — never on top of the thing being inspected.
  const vw = window.innerWidth, vh = window.innerHeight, gap = 10, pad = 8;
  const maxX = vw - PANEL_W - pad, maxY = vh - height - pad, minY = TOOLBAR_H + pad;
  const clampX = (v: number): number => Math.round(Math.max(pad, Math.min(maxX, v)));
  const clampY = (v: number): number => Math.round(Math.max(minY, Math.min(maxY, v)));
  let x: number, y: number;
  if (anchor.bottom + gap <= maxY) { x = clampX(anchor.left); y = Math.round(anchor.bottom + gap); }
  else if (anchor.top - gap - height >= minY) { x = clampX(anchor.left); y = Math.round(anchor.top - gap - height); }
  else if (anchor.right + gap <= maxX) { x = Math.round(anchor.right + gap); y = clampY(anchor.top); }
  else { x = clampX(anchor.left - gap - PANEL_W); y = clampY(anchor.top); }

  const toggle = (key: SectionKey) => () => setOpen((cur) => (cur === key ? null : key));
  const elRect = sel.el.getBoundingClientRect();

  return (
    <motion.div
      ref={ref}
      data-demo-ui="true"
      // Opens in place and fades; moving to another target glides with the hover spring.
      initial={{ opacity: 0, x, y }}
      animate={{ opacity: 1, x, y }}
      exit={{ opacity: 0 }}
      transition={{ ...move, opacity: { duration: 0.15, ease: 'easeOut' } }}
      style={{
        position: 'fixed', left: 0, top: 0, width: PANEL_W, boxSizing: 'border-box', zIndex: 9001,
        background: UI.bg, border: `1px solid ${UI.border}`, borderRadius: 14, boxShadow: UI.shadow,
        fontFamily: UI.font, fontSize: 12, color: UI.textPrimary, overflow: 'hidden', userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '9px 12px' }}>
        <span style={{ fontFamily: UI.mono, fontSize: 11, color: UI.textSecondary }}>&lt;{sel.el.tagName.toLowerCase()}&gt;</span>
        <span style={{ fontFamily: UI.mono, fontSize: 11 }}>{dims(elRect)}</span>
      </div>

      {type.length > 0 && (
        <Section
          title="Typography" open={open === 'type'} onToggle={toggle('type')}
          summary={<span style={{ color: UI.textMuted, fontSize: 11, fontWeight: 400 }}>{type[0]?.value}</span>}
        >
          {type.map((t) => <PropRow key={t.label} {...t} />)}
        </Section>
      )}

      <Section
        title="Colours" open={open === 'colours'} onToggle={toggle('colours')}
        summary={
          <span style={{ display: 'inline-flex', gap: 3 }}>
            {colours.slice(0, 4).map((c) => (
              <span key={c.hex} style={{ width: 10, height: 10, borderRadius: '50%', background: c.raw, border: `1px solid ${UI.border}` }} />
            ))}
          </span>
        }
      >
        {colours.length > 0 && <Segmented value={format} onChange={setFormat} />}
        {colours.length === 0
          ? <div style={{ color: UI.textMuted, fontSize: 11, padding: '6px 0' }}>No colours on this element</div>
          : colours.map((c) => <PropRow key={c.hex} label={c.label} value={c[format]} swatch={c.raw} />)}
      </Section>

      <Section title="Box" open={open === 'box'} onToggle={toggle('box')}>
        {box.map((b) => <PropRow key={b.label} {...b} />)}
      </Section>
    </motion.div>
  );
}

function InspectOverlay({ setCursor }: { setCursor: (c: DemoCursor) => void }) {
  useViewportTick();
  const [hover, setHover] = useState<{ el: Element; range: Range | null } | null>(null);
  const [sel, setSel] = useState<Selection | null>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (isOurUI(e.target as Element)) return;
      const word = wordAt(e.clientX, e.clientY);
      const el = word ? word.el : getTarget(e.clientX, e.clientY);
      setHover((prev) => {
        if (!el) return null;
        const range = word ? word.range : null;
        return prev && prev.el === el && sameRange(prev.range, range) ? prev : { el, range };
      });
      setCursor(word ? 'text' : 'crosshair');
    }
    // Click a word or element to open its details; click it again, or empty space, to close.
    function onClick(e: MouseEvent) {
      if (isOurUI(e.target as Element)) return;
      e.preventDefault();
      e.stopPropagation();
      const word = wordAt(e.clientX, e.clientY);
      const el = word ? word.el : getTarget(e.clientX, e.clientY);
      const range = word ? word.range : null;
      setSel((cur) => {
        if (!el) return null;
        if (cur && cur.el === el && sameRange(cur.range, range)) return null;
        return { el, range };
      });
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setSel(null); }
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKey);
      setCursor('crosshair');
    };
  }, [setCursor]);

  useTextHighlight([sel?.range, hover?.range]);

  const rectOf = (t: { el: Element; range: Range | null }): DOMRect =>
    (t.range ? t.range.getBoundingClientRect() : t.el.getBoundingClientRect());
  const live = (t: { el: Element } | null): boolean => !!t && t.el.isConnected;

  const hoverRect = live(hover) ? rectOf(hover!) : null;
  const selRect = live(sel) ? rectOf(sel!) : null;
  const hoveringSelection = !!hover && !!sel && hover.el === sel.el && sameRange(hover.range, sel.range);

  return (
    <>
      {selRect && <ElementHighlight box={toBox(selRect)} selected outline={!!sel!.range} z={8899} />}
      {hoverRect && !hoveringSelection && <ElementHighlight box={toBox(hoverRect)} outline={!!hover!.range} />}
      {/* Elements (not words) also show their size */}
      {hoverRect && !hover!.range && (
        <Chip x={hoverRect.left} y={hoverRect.top > TOOLBAR_H + 34 ? hoverRect.top - 30 : hoverRect.bottom + 8}>
          {dims(hoverRect)}
        </Chip>
      )}
      <AnimatePresence>
        {sel && selRect && <DetailsPanel key="details" sel={sel} anchor={selRect} />}
      </AnimatePresence>
    </>
  );
}

// ─── 2. Measure ───────────────────────────────────────────────────────────────
// Click elements to pin them; each consecutive pair is measured.

const MAX_PINS = 5;
const BADGES = ['A', 'B', 'C', 'D', 'E'];

/** Run the line through the stretch both elements share, so it leaves one edge and lands on the other. */
function crossAxis(a0: number, a1: number, b0: number, b1: number): number {
  const from = Math.max(a0, b0), to = Math.min(a1, b1);
  return to > from ? (from + to) / 2 : (a0 + a1) / 2;
}

function measurePair(a: DOMRect, b: DOMRect) {
  const hGap = Math.max(a.left - b.right, b.left - a.right, 0);
  const vGap = Math.max(a.top - b.bottom, b.top - a.bottom, 0);
  if (hGap > 0 && hGap >= vGap) {
    const y = crossAxis(a.top, a.bottom, b.top, b.bottom);
    const forward = a.right <= b.left;
    return { x1: forward ? a.right : a.left, y1: y, x2: forward ? b.left : b.right, y2: y, gap: hGap, horizontal: true };
  }
  const x = crossAxis(a.left, a.right, b.left, b.right);
  const forward = a.bottom <= b.top;
  return { x1: x, y1: forward ? a.bottom : a.top, x2: x, y2: forward ? b.top : b.bottom, gap: vGap, horizontal: false };
}

const LINE_S = 0.33;
const CAP_S = 0.1;
/** Leaving is quicker than arriving. */
const RETRACT_S = LINE_S * 0.7;
const STROKE = 'rgba(255,69,0,0.85)';
const EASE_IN_OUT = [0.645, 0.045, 0.355, 1] as const;

/**
 * Three beats, in the order the elements were picked: a cap opens on the first
 * element's edge, the line runs straight to the second, and when it lands the
 * cap on that edge opens out with the distance. When one of its elements is
 * unpinned the line draws back into the element that is still there.
 */
function MeasureLine({ a, b, aId, wait }: { a: DOMRect; b: DOMRect; aId: number; wait: number }) {
  const reduce = useReducedMotion();
  // Decided once: a line that replaces two removed ones waits for them to pull back.
  const [delay] = useState(wait);
  const { x1, y1, x2, y2, gap, horizontal } = measurePair(a, b);
  const CAP = 4;
  const t = (duration: number, after: number) => (reduce ? { duration: 0 } : { duration, delay: delay + after, ease: EASE_IN_OUT });
  const out = reduce ? { duration: 0 } : { duration: RETRACT_S, ease: EASE_IN_OUT };
  const cap = (x: number, y: number, after: number) => {
    const from = { x1: x, y1: y, x2: x, y2: y };
    const to = horizontal ? { x1: x, y1: y - CAP, x2: x, y2: y + CAP } : { x1: x - CAP, y1: y, x2: x + CAP, y2: y };
    return (
      <motion.line
        initial={from} animate={to} exit={{ opacity: 0, transition: { duration: 0.08 } }} transition={t(CAP_S, after)}
        stroke={STROKE} strokeWidth="1.5" strokeLinecap="round"
      />
    );
  };
  return (
    <>
      <svg data-demo-ui="true" style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 8950, overflow: 'visible' }}>
        {cap(x1, y1, 0)}
        <motion.line
          initial={{ x1, y1, x2: x1, y2: y1 }} animate={{ x1, y1, x2, y2 }} transition={t(LINE_S, 0)}
          // `removed` is the id of the element that was unpinned: pull back towards the other one.
          variants={{ exit: (removed: number) => ({ ...(removed === aId ? { x1: x2, y1: y2 } : { x2: x1, y2: y1 }), transition: out }) }}
          exit="exit"
          stroke={STROKE} strokeWidth="1.5" strokeLinecap="round"
        />
        {cap(x2, y2, LINE_S)}
      </svg>
      <motion.div
        data-demo-ui="true"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.08 } }}
        transition={reduce ? { duration: 0 } : { duration: 0.15, delay: delay + LINE_S }}
        style={{ ...CHIP, left: (x1 + x2) / 2, top: (y1 + y2) / 2, transform: 'translate(-50%, -50%)' } as MotionStyle}
      >
        {Math.round(gap)}px
      </motion.div>
    </>
  );
}

function MeasureOverlay({ setCursor }: { setCursor: (c: DemoCursor) => void }) {
  useViewportTick();
  const [pins, setPins] = useState<{ id: number; el: Element }[]>([]);
  const [hover, setHover] = useState<Element | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const nextId = useRef(0);
  // Which element was last unpinned, and when — its lines pull back and their replacement waits.
  const [removedId, setRemovedId] = useState(-1);
  const removedAt = useRef(0);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      setHover(isOurUI(e.target as Element) ? null : getTarget(e.clientX, e.clientY));
    }
    function onClick(e: MouseEvent) {
      if (isOurUI(e.target as Element)) return;
      const el = getTarget(e.clientX, e.clientY);
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      setPins((prev) => {
        // Clicking a pinned element removes just that pin.
        const pinned = prev.find((p) => p.el === el);
        if (pinned) {
          setAnnouncement('Element unpinned.');
          setRemovedId(pinned.id);
          removedAt.current = performance.now();
          return prev.filter((p) => p.el !== el);
        }
        // At the limit, the oldest pin makes room.
        const kept = prev.length >= MAX_PINS ? prev.slice(1) : prev;
        const next = [...kept, { id: nextId.current++, el }];
        setAnnouncement(next.length === 1 ? 'First element pinned. Click a second element to measure.' : 'Distance measured.');
        return next;
      });
    }
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('click', onClick, true);
    };
  }, []);

  const livePins = pins.filter((p) => p.el.isConnected);
  const rects = livePins.map((p) => p.el.getBoundingClientRect());
  const hoverPinned = !!hover && livePins.some((p) => p.el === hover);
  const last = rects[rects.length - 1];

  // Over a pinned element the cursor becomes a minus: a click there unpins it.
  useEffect(() => {
    setCursor(hoverPinned ? 'remove' : 'crosshair');
    return () => setCursor('crosshair');
  }, [hoverPinned, setCursor]);

  return (
    <>
      <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>

      {hover && !hoverPinned && <ElementHighlight box={toBox(hover.getBoundingClientRect())} />}

      {livePins.map((p, i) => (
        <div key={p.id}>
          <ElementHighlight box={toBox(rects[i]!)} selected z={8899} />
          {/* Size only for the pinned element under the pointer, so labels do not pile up */}
          {hover === p.el && (
            <Chip x={rects[i]!.left + 14} y={Math.max(TOOLBAR_H + 4, rects[i]!.top - 28)}>{dims(rects[i]!)}</Chip>
          )}
        </div>
      ))}

      <AnimatePresence custom={removedId}>
        {livePins.slice(1).map((p, i) => (
          <MeasureLine
            key={`${livePins[i]!.id}-${p.id}`} a={rects[i]!} b={rects[i + 1]!} aId={livePins[i]!.id}
            wait={performance.now() - removedAt.current < 100 ? RETRACT_S : 0}
          />
        ))}
      </AnimatePresence>

      {/* Lettered markers, above the lines */}
      {livePins.map((p, i) => (
        <div
          key={p.id} data-demo-ui="true"
          style={{
            position: 'fixed', left: Math.max(10, rects[i]!.left), top: Math.max(TOOLBAR_H + 10, rects[i]!.top),
            width: 16, height: 16, margin: '-8px 0 0 -8px', borderRadius: '50%', boxSizing: 'border-box',
            background: UI.accent, border: '1.5px solid #fff', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: UI.font, fontSize: 10, fontWeight: 600, lineHeight: 1,
            pointerEvents: 'none', zIndex: 8955,
          }}
        >
          {BADGES[i]}
        </div>
      ))}

      {/* The site has no toasts, so the one next step is shown here, only until a second element is picked */}
      {last && livePins.length === 1 && (
        <Chip x={last.left} y={last.bottom + 8} style={{ fontFamily: UI.font, color: UI.textSecondary }}>
          Click another element to measure
        </Chip>
      )}
    </>
  );
}

// ─── 3. Guides ────────────────────────────────────────────────────────────────
// Click to place; hover a guide to delete it with a click or move it with a drag.

interface Guide { id: number; axis: 'h' | 'v'; pos: number }

const GUIDE_HIT = 4;
const DRAG_THRESHOLD = 4;

function GuidesOverlay({ setCursor }: { setCursor: (c: DemoCursor) => void }) {
  useViewportTick();
  const [mouse, setMouse] = useState({ x: -100, y: -100 });
  const [guides, setGuides] = useState<Guide[]>([]);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const nextId = useRef(0);
  const guidesRef = useRef<Guide[]>([]);
  guidesRef.current = guides;
  const press = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const swallowClick = useRef(false);
  // A guide you just placed is under the pointer already; it only becomes
  // deletable once you have moved off it and come back.
  const unarmed = useRef(new Set<number>());

  useEffect(() => {
    // Guides are stored in page coordinates so they scroll with the content.
    const view = (g: Guide): number => (g.axis === 'h' ? g.pos - window.scrollY : g.pos - window.scrollX);
    const near = (g: Guide, x: number, y: number): boolean => Math.abs((g.axis === 'h' ? y : x) - view(g)) <= GUIDE_HIT;
    const guideAt = (x: number, y: number): Guide | null =>
      guidesRef.current.find((g) => !unarmed.current.has(g.id) && near(g, x, y)) ?? null;

    function onMove(e: MouseEvent) {
      if (isOurUI(e.target as Element) && !press.current) return;
      setMouse({ x: e.clientX, y: e.clientY });

      const p = press.current;
      if (p) {
        // A press only becomes a move once the pointer has travelled; a still press is a delete.
        if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_THRESHOLD) return;
        p.moved = true;
        const g = guidesRef.current.find((x) => x.id === p.id);
        if (!g) return;
        setMoving(true);
        setCursor(g.axis === 'h' ? 'move-y' : 'move-x');
        const pos = g.axis === 'h' ? e.clientY + window.scrollY : e.clientX + window.scrollX;
        setGuides((prev) => prev.map((x) => (x.id === p.id ? { ...x, pos } : x)));
        return;
      }

      for (const id of [...unarmed.current]) {
        const g = guidesRef.current.find((x) => x.id === id);
        if (!g || !near(g, e.clientX, e.clientY)) unarmed.current.delete(id);
      }
      const hit = guideAt(e.clientX, e.clientY);
      setHoveredId(hit?.id ?? null);
      setCursor(hit ? 'delete' : 'crosshair');
    }

    function onDown(e: MouseEvent) {
      swallowClick.current = false;
      if (e.button !== 0 || isOurUI(e.target as Element)) return;
      const hit = guideAt(e.clientX, e.clientY);
      if (!hit) return;
      press.current = { id: hit.id, x: e.clientX, y: e.clientY, moved: false };
      e.preventDefault();
    }

    function onUp(e: MouseEvent) {
      const p = press.current;
      if (!p) return;
      press.current = null;
      swallowClick.current = true;
      setMoving(false);
      if (!p.moved) setGuides((prev) => prev.filter((g) => g.id !== p.id));
      const hit = p.moved ? guideAt(e.clientX, e.clientY) : null;
      setHoveredId(hit?.id ?? null);
      setCursor(hit ? 'delete' : 'crosshair');
    }

    function onClick(e: MouseEvent) {
      if (swallowClick.current) { swallowClick.current = false; return; }
      if (isOurUI(e.target as Element) || e.clientY < TOOLBAR_H) return;
      if (guideAt(e.clientX, e.clientY)) return;
      e.preventDefault();
      e.stopPropagation();
      // Placement lands exactly where you click — no snapping.
      const h = { id: nextId.current++, axis: 'h' as const, pos: e.clientY + window.scrollY };
      const v = { id: nextId.current++, axis: 'v' as const, pos: e.clientX + window.scrollX };
      unarmed.current.add(h.id);
      unarmed.current.add(v.id);
      setGuides((prev) => [...prev, h, v]);
    }

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('click', onClick, true);
      setCursor('crosshair');
    };
  }, [setCursor]);

  const line = (axis: 'h' | 'v', at: number, opacity: number): CSSProperties => (axis === 'h'
    ? { position: 'fixed', left: 0, right: 0, top: at, height: 1, transform: 'translateY(-0.5px)', background: UI.accent, opacity, pointerEvents: 'none', zIndex: 8800 }
    : { position: 'fixed', top: TOOLBAR_H, bottom: 0, left: at, width: 1, transform: 'translateX(-0.5px)', background: UI.accent, opacity, pointerEvents: 'none', zIndex: 8800 });

  const overGuide = hoveredId !== null || moving;
  const dragged = moving ? guides.find((g) => g.id === press.current?.id) : undefined;

  return (
    <>
      {/* Placement preview — hidden over a guide, where a click deletes instead of adding */}
      {!overGuide && mouse.y > TOOLBAR_H && (
        <>
          <div data-demo-ui="true" style={line('v', mouse.x, 0.4)} />
          <div data-demo-ui="true" style={line('h', mouse.y, 0.4)} />
        </>
      )}

      <AnimatePresence>
        {guides.map((g) => {
          const at = g.axis === 'h' ? g.pos - window.scrollY : g.pos - window.scrollX;
          const active = g.id === hoveredId || g.id === dragged?.id;
          return (
            <motion.div
              key={g.id} data-demo-ui="true"
              exit={{ opacity: 0 }} transition={{ duration: 0.16 }}
              style={line(g.axis, at, active ? 0.8 : 0.5) as MotionStyle}
            />
          );
        })}
      </AnimatePresence>

      {mouse.y > TOOLBAR_H && (
        <Chip x={mouse.x + 10} y={mouse.y - 26}>
          {dragged ? `${Math.round(dragged.pos)}px` : `${Math.round(mouse.x)}, ${Math.round(mouse.y)}`}
        </Chip>
      )}
      {hoveredId !== null && !moving && (
        <Chip x={mouse.x + 16} y={mouse.y + 16} style={{ fontFamily: UI.font, color: UI.textSecondary }}>
          Click to delete · Drag to move
        </Chip>
      )}
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function DemoOverlay() {
  const demo = useDemo();
  return (
    <>
      {/* Hover states for the details panel, and the accent text highlight */}
      <style>{`
        .demo-row { transition: background 0.1s ease; }
        .demo-row:hover { background: ${UI.hover}; }
        ::highlight(${HIGHLIGHT_NAME}) { background-color: ${UI.accent}; color: #fff; }
      `}</style>
      {demo.inspect && <InspectOverlay setCursor={demo.setCursor} />}
      {demo.measure && <MeasureOverlay setCursor={demo.setCursor} />}
      {demo.guides  && <GuidesOverlay setCursor={demo.setCursor} />}
    </>
  );
}
