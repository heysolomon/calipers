import { DemoTrigger } from '../components/demo-trigger';
import { ExpandableSection, type SectionRow } from '../components/expandable-section';
import { Footer } from '../components/footer';
import { CHROME_STORE_URL, GITHUB_URL } from '../lib/site';

// ─── Data ─────────────────────────────────────────────────────────────────────

const MODE_ROWS: SectionRow[] = [
  {
    id: 'inspect',
    leftBadge: '1',
    left: 'Inspect',
    right: 'Hover for size; click for typography, colours & box values',
  },
  {
    id: 'measure',
    leftBadge: '2',
    left: 'Measure',
    right: 'Click up to 5 elements — all gaps measured simultaneously',
  },
  {
    id: 'guides',
    leftBadge: '3',
    left: 'Guides',
    right: 'Click to place, click to delete, drag to move — saved per page',
  },
  {
    id: 'annotate',
    leftBadge: '4',
    left: 'Annotate',
    right: 'Size callouts, notes, arrows & freehand strokes on the page',
  },
];

const TOOL_ROWS: SectionRow[] = [
  {
    id: 'box-model',
    left: 'Box values',
    right: 'Margin, border, padding & radius of any element, one click to copy',
  },
  {
    id: 'ruler',
    left: 'Ruler overlay',
    right: 'Pixel rulers along the viewport edges with cursor crosshair',
  },
  {
    id: 'design-tokens',
    left: 'Design tokens',
    right: 'Extract all CSS custom properties; export as JSON with one click',
  },
  {
    id: 'screenshot',
    left: 'Screenshot export',
    right: 'Capture the visible viewport with measurements baked in',
  },
  {
    id: 'typography',
    left: 'Typography & colours',
    right: 'Font, size, weight, line height, letter spacing; colours as HEX, RGB or HSL',
  },
  {
    id: 'undo',
    left: 'Undo',
    right: 'Reverse any change in Measure, Guides & Annotate',
  },
  {
    id: 'region-capture',
    left: 'Region capture',
    right: 'Drag a rectangle to save just that part of the page',
  },
  {
    id: 'multi',
    left: 'Multi-element measure',
    right: 'Pin multiple elements; every consecutive pair is measured at once',
  },
];

const SHORTCUT_ROWS: SectionRow[] = [
  { id: 'modes', left: 'Switch mode', right: '1 – 4', rightIsKbd: true, rowPadding: '7px 0' },
  { id: 'undo', left: 'Undo', right: '⌘Z', rightIsKbd: true, rowPadding: '7px 0' },
  { id: 'tokens', left: 'Open design tokens', right: 'D', rightIsKbd: true, rowPadding: '7px 0' },
  {
    id: 'screenshot',
    left: 'Capture screenshot',
    right: 'S',
    rightIsKbd: true,
    rowPadding: '7px 0',
  },
  { id: 'help', left: 'Show all shortcuts', right: '?', rightIsKbd: true, rowPadding: '7px 0' },
  { id: 'clear', left: 'Clear guides', right: 'Del / ⌫', rightIsKbd: true, rowPadding: '7px 0' },
  { id: 'deactivate', left: 'Deactivate', right: 'Esc', rightIsKbd: true, rowPadding: '7px 0' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <h2
      style={{
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#C4C4C4',
        marginBottom: '8px',
        marginTop: '28px',
        scrollMarginTop: '5rem',
      }}
    >
      {label}
    </h2>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingTop: '36px' }}
    >
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '80px 24px 64px',
          textAlign: 'center',
        }}
      >
        {/* Wordmark */}
        <h1
          style={{
            fontSize: 'clamp(3.5rem, 11vw, 10rem)',
            fontWeight: 600,
            fontFamily: '"Ashbury", "Georgia", "Times New Roman", serif',
            letterSpacing: '-0.04em',
            lineHeight: 0.95,
            color: '#000',
            marginBottom: '40px',
          }}
        >
          Calipers
        </h1>

        {/* Tagline */}
        <p
          style={{
            maxWidth: '420px',
            fontSize: '13px',
            lineHeight: 1.75,
            color: '#737373',
            marginBottom: '32px',
            letterSpacing: '-0.01em',
          }}
        >
          Precision measurement for the web. A free, open-source browser extension with four
          modes for inspecting, measuring, aligning, and annotating — plus typography, colours,
          and design tokens, with pixel-perfect accuracy.
        </p>

        {/* CTA */}
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
        >
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#fff',
                background: '#000',
                padding: '7px 16px',
                borderRadius: '6px',
                textDecoration: 'none',
                letterSpacing: '-0.01em',
              }}
            >
              Install for Chrome →
              <span className="sr-only"> (opens in new tab)</span>
            </a>
            <DemoTrigger />
          </div>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="site-link"
            style={{
              fontSize: '11.5px',
              color: '#D4D4D4',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
              letterSpacing: '-0.01em',
            }}
          >
            View on GitHub
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section
        style={{
          width: '100%',
          maxWidth: '640px',
          margin: '0 auto',
          padding: '0 24px 80px',
        }}
      >
        <SectionLabel label="Modes" />
        <ExpandableSection items={MODE_ROWS} initialCount={3} showMoreLabel="modes" />

        <SectionLabel label="Tools &amp; Overlays" />
        <ExpandableSection items={TOOL_ROWS} initialCount={4} showMoreLabel="tools" />
      </section>

      {/* ── Keyboard shortcuts ──────────────────────────────────────────────── */}
      <section
        style={{
          width: '100%',
          maxWidth: '640px',
          margin: '0 auto',
          padding: '0 24px 80px',
        }}
      >
        <SectionLabel label="Shortcuts" />
        <ExpandableSection items={SHORTCUT_ROWS} initialCount={4} showMoreLabel="shortcuts" />
      </section>

      {/* ── Browser support ─────────────────────────────────────────────────── */}
      <section
        style={{
          width: '100%',
          maxWidth: '640px',
          margin: '0 auto',
          padding: '0 24px 80px',
        }}
      >
        <SectionLabel label="Browser Support" />
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          {[
            { name: 'Chrome', note: 'Manifest V3' },
            { name: 'Firefox', note: 'Manifest V2' },
          ].map(({ name, note }) => (
            <div
              key={name}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#000',
                letterSpacing: '-0.01em',
              }}
            >
              <span>{name}</span>
              <span style={{ fontSize: '10px', color: '#999' }}>{note}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Open source ─────────────────────────────────────────────────────── */}
      <section
        style={{
          width: '100%',
          maxWidth: '640px',
          margin: '0 auto',
          padding: '0 24px 120px',
        }}
      >
        <SectionLabel label="Open Source" />
        <p
          style={{
            fontSize: '13px',
            color: '#737373',
            lineHeight: 1.75,
            letterSpacing: '-0.01em',
            maxWidth: '380px',
          }}
        >
          Calipers is free and open source under the MIT License. Contributions, bug reports, and
          feature requests are welcome on{' '}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="site-link"
            style={{ color: '#000', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
          >
            GitHub
            <span className="sr-only"> (opens in new tab)</span>
          </a>
          .
        </p>
      </section>

      <Footer />
    </main>
  );
}
