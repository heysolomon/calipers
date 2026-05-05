import Link from 'next/link';
import { DemoTrigger } from '../components/demo-trigger';

// ─── Data ─────────────────────────────────────────────────────────────────────

const MODES = [
  { key: '1', name: 'Inspect',       desc: 'Dimensions, box model, CSS path, typography & viewport distances' },
  { key: '2', name: 'Measure',       desc: 'Click up to 5 elements — all gaps measured simultaneously'         },
  { key: '3', name: 'Guides',        desc: 'Draggable guides with snap-to-element edges, persisted across sessions' },
  { key: '4', name: 'Colour Picker', desc: 'Sample element colours and copy as HEX, RGB, or HSL'               },
  { key: '5', name: 'Spacing Grid',  desc: 'Show all gaps between sibling elements at once'                     },
];

const TOOLS = [
  { name: 'Box model overlay',    desc: 'Colour-coded margin / border / padding / content rings on any element' },
  { name: 'Ruler overlay',        desc: 'Pixel rulers along the viewport edges with cursor crosshair'           },
  { name: 'Design tokens',        desc: 'Extract all CSS custom properties; export as JSON with one click'      },
  { name: 'Screenshot export',    desc: 'Capture the visible viewport with measurements baked in'               },
  { name: 'Typography inspector', desc: 'Font family, size, weight, line-height, and letter-spacing for text nodes' },
  { name: 'Viewport distances',   desc: 'Dashed lines from element edges to viewport edges with px labels'      },
  { name: 'Element path',         desc: 'CSS selector breadcrumb of the hovered element shown inline'           },
  { name: 'Multi-element measure','desc': 'Pin multiple elements; every consecutive pair is measured at once'   },
];

const SHORTCUTS = [
  ['1 – 5',   'Switch mode'],
  ['B',        'Toggle box model overlay'],
  ['D',        'Open design token panel'],
  ['S',        'Capture screenshot'],
  ['?',        'Show all shortcuts'],
  ['Del / ⌫', 'Clear guides'],
  ['Esc',      'Deactivate'],
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

function Divider() {
  return <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)' }} />;
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
            href="https://github.com/calipers/calipers"
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
        {/* Modes */}
        <SectionLabel label="Modes" />
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {MODES.map(({ key, name, desc }, i) => (
            <li key={name}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: '16px',
                  padding: '9px 0',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    color: '#000',
                    letterSpacing: '-0.01em',
                    flexShrink: 0,
                  }}
                >
                  <kbd
                    style={{
                      fontSize: '9px',
                      fontFamily: '"JetBrains Mono", monospace',
                      color: '#737373',
                      background: '#fff',
                      border: '1px solid rgba(0,0,0,0.12)',
                      borderBottomWidth: '2px',
                      borderRadius: '3px',
                      padding: '1px 5px',
                    }}
                  >
                    {key}
                  </kbd>
                  {name}
                </span>
                <span
                  style={{
                    fontSize: '11.5px',
                    color: '#999',
                    textAlign: 'right',
                    lineHeight: 1.5,
                  }}
                >
                  {desc}
                </span>
              </div>
              {i < MODES.length - 1 && <Divider />}
            </li>
          ))}
        </ul>

        {/* Tools */}
        <SectionLabel label="Tools &amp; Overlays" />
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {TOOLS.map(({ name, desc }, i) => (
            <li key={name}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: '16px',
                  padding: '9px 0',
                }}
              >
                <span style={{ fontSize: '13px', color: '#000', letterSpacing: '-0.01em', flexShrink: 0 }}>
                  {name}
                </span>
                <span style={{ fontSize: '11.5px', color: '#999', textAlign: 'right', lineHeight: 1.5 }}>
                  {desc}
                </span>
              </div>
              {i < TOOLS.length - 1 && <Divider />}
            </li>
          ))}
        </ul>
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
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {SHORTCUTS.map(([key, label], i) => (
            <li key={key}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '7px 0',
                }}
              >
                <span style={{ fontSize: '13px', color: '#737373', letterSpacing: '-0.01em' }}>{label}</span>
                <kbd
                  style={{
                    fontSize: '10px',
                    fontFamily: '"JetBrains Mono", monospace',
                    color: '#000',
                    background: '#fff',
                    border: '1px solid rgba(0,0,0,0.12)',
                    borderBottomWidth: '2px',
                    borderRadius: '4px',
                    padding: '1px 7px',
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {key}
                </kbd>
              </div>
              {i < SHORTCUTS.length - 1 && <Divider />}
            </li>
          ))}
        </ul>
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
            href="https://github.com/calipers/calipers"
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
            { label: 'GitHub',    href: 'https://github.com/calipers/calipers' },
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
