import Link from 'next/link';
import { DemoTrigger } from '../components/demo-trigger';

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  { name: 'Inspect mode',      desc: 'Hover any element to read its dimensions'     },
  { name: 'Measure distances', desc: 'Click two elements to measure the gap'         },
  { name: 'Alignment guides',  desc: 'Pin crosshair guides anywhere on the page'     },
  { name: 'Box model overlay', desc: 'Visualise margin, border, padding and content' },
  { name: 'Screenshot export', desc: 'Capture a pixel-perfect snapshot'              },
];

const SHORTCUTS = [
  ['1 / 2 / 3', 'Switch mode'],
  ['B',          'Toggle box model'],
  ['S',          'Screenshot'],
  ['?',          'Show shortcuts'],
  ['Esc',        'Close'],
];

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
            fontFamily: '"Playfair Display", "Georgia", "Times New Roman", serif',
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
            maxWidth: '400px',
            fontSize: '13px',
            lineHeight: 1.75,
            color: '#737373',
            marginBottom: '32px',
            letterSpacing: '-0.01em',
          }}
        >
          Precision measurement for the web. A free, open-source Chrome extension
          for measuring distances, inspecting dimensions, and checking alignment —
          with pixel-perfect accuracy.
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
        <p
          style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#999',
            marginBottom: '12px',
          }}
        >
          Features
        </p>

        <ul style={{ listStyle: 'none', padding: 0 }}>
          {FEATURES.map(({ name, desc }, i) => (
            <li
              key={name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: '16px',
                padding: '8px 0',
                borderBottom: i < FEATURES.length - 1
                  ? '1px solid rgba(0,0,0,0.06)'
                  : 'none',
              }}
            >
              <span style={{ fontSize: '13px', color: '#000', letterSpacing: '-0.01em' }}>
                {name}
              </span>
              <span style={{ fontSize: '11.5px', color: '#999', whiteSpace: 'nowrap', textAlign: 'right' }}>
                {desc}
              </span>
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
        <p
          style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#999',
            marginBottom: '12px',
          }}
        >
          Shortcuts
        </p>

        <ul style={{ listStyle: 'none', padding: 0 }}>
          {SHORTCUTS.map(([key, label], i) => (
            <li
              key={key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
                borderBottom: i < SHORTCUTS.length - 1
                  ? '1px solid rgba(0,0,0,0.06)'
                  : 'none',
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
                }}
              >
                {key}
              </kbd>
            </li>
          ))}
        </ul>
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
        <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999', marginBottom: '12px' }}>
          Open Source
        </p>
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
