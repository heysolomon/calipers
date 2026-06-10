import Link from 'next/link';
import { DemoTrigger } from '../components/demo-trigger';
import { ExpandableSection, type SectionRow } from '../components/expandable-section';

// ─── Data ─────────────────────────────────────────────────────────────────────

const MODE_ROWS: SectionRow[] = [
  { id: 'inspect',      leftBadge: '1', left: 'Inspect',       right: 'Dimensions, box model, CSS path, typography & viewport distances' },
  { id: 'measure',      leftBadge: '2', left: 'Measure',       right: 'Click up to 5 elements — all gaps measured simultaneously'         },
  { id: 'guides',       leftBadge: '3', left: 'Guides',        right: 'Draggable guides with snap-to-element edges, persisted across sessions' },
  { id: 'colour',       leftBadge: '4', left: 'Colour Picker', right: 'Sample element colours and copy as HEX, RGB, or HSL'               },
  { id: 'spacing-grid', leftBadge: '5', left: 'Spacing Grid',  right: 'Show all gaps between sibling elements at once'                    },
];

const TOOL_ROWS: SectionRow[] = [
  { id: 'box-model',     left: 'Box model overlay',    right: 'Colour-coded margin / border / padding / content rings on any element' },
  { id: 'ruler',         left: 'Ruler overlay',        right: 'Pixel rulers along the viewport edges with cursor crosshair'           },
  { id: 'design-tokens', left: 'Design tokens',        right: 'Extract all CSS custom properties; export as JSON with one click'      },
  { id: 'screenshot',    left: 'Screenshot export',    right: 'Capture the visible viewport with measurements baked in'               },
  { id: 'typography',    left: 'Typography inspector', right: 'Font family, size, weight, line-height, and letter-spacing for text nodes' },
  { id: 'viewport',      left: 'Viewport distances',   right: 'Dashed lines from element edges to viewport edges with px labels'      },
  { id: 'element-path',  left: 'Element path',         right: 'CSS selector breadcrumb of the hovered element shown inline'           },
  { id: 'multi',         left: 'Multi-element measure', right: 'Pin multiple elements; every consecutive pair is measured at once'    },
];

const SHORTCUT_ROWS: SectionRow[] = [
  { id: 'modes',      left: 'Switch mode',          right: '1 – 5',   rightIsKbd: true, rowPadding: '7px 0' },
  { id: 'box',        left: 'Toggle box model',      right: 'B',       rightIsKbd: true, rowPadding: '7px 0' },
  { id: 'tokens',     left: 'Open design tokens',    right: 'D',       rightIsKbd: true, rowPadding: '7px 0' },
  { id: 'screenshot', left: 'Capture screenshot',    right: 'S',       rightIsKbd: true, rowPadding: '7px 0' },
  { id: 'help',       left: 'Show all shortcuts',    right: '?',       rightIsKbd: true, rowPadding: '7px 0' },
  { id: 'clear',      left: 'Clear guides',          right: 'Del / ⌫', rightIsKbd: true, rowPadding: '7px 0' },
  { id: 'deactivate', left: 'Deactivate',            right: 'Esc',     rightIsKbd: true, rowPadding: '7px 0' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <p
      style={{
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#C4C4C4',
        marginBottom: '8px',
        marginTop: '28px',
      }}
    >
      {label}
    </p>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingTop: '36px' }}>

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
          Precision measurement for the web. A free, open-source browser extension
          with five measurement modes, a colour picker, design token extraction,
          typography inspection, and more — with pixel-perfect accuracy.
        </p>

        {/* CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a
              href="https://chromewebstore.google.com"
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
            </a>
            <DemoTrigger />
          </div>
          <a
            href="https://github.com/heysolomon/calipers"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '11.5px',
              color: '#D4D4D4',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
              letterSpacing: '-0.01em',
            }}
          >
            View on GitHub
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
            { name: 'Chrome',  note: 'Manifest V3' },
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
        <p style={{ fontSize: '13px', color: '#737373', lineHeight: 1.75, letterSpacing: '-0.01em', maxWidth: '380px' }}>
          Calipers is free and open source under the MIT License. Contributions,
          bug reports, and feature requests are welcome on{' '}
          <a
            href="https://github.com/heysolomon/calipers"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#000', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
          >
            GitHub
          </a>
          .
        </p>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer
        style={{
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          background: '#F7F7F7',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          fontSize: '11px',
          color: '#D4D4D4',
          letterSpacing: '-0.01em',
          marginTop: 'auto',
        }}
      >
        <span>MIT License · Free forever</span>

        <nav style={{ display: 'flex', gap: '16px' }}>
          {[
            { label: 'Docs',      href: '/docs'          },
            { label: 'Changelog', href: '/changelog'     },
            { label: 'GitHub',    href: 'https://github.com/heysolomon/calipers' },
          ].map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              style={{ color: '#737373', textDecoration: 'none', fontSize: '11px' }}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>

        <span>v0.1.0</span>
      </footer>

    </main>
  );
}
