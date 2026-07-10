import type { Metadata } from 'next';
import type { JSX } from 'react';
import Link from 'next/link';
import { Navbar } from '../../components/navbar';
import { Footer } from '../../components/footer';
import { buildPageMetadata } from '../../components/content-page';
import { GITHUB_URL } from '../../lib/site';

export const metadata: Metadata = buildPageMetadata({
  title: 'Changelog',
  description:
    'Release history for Calipers — the free, open-source Chrome extension for measuring distances and inspecting dimensions on any webpage.',
  path: '/changelog',
});

type SectionName = 'Added' | 'Changed' | 'Fixed' | 'Removed';

type ChangelogEntry = {
  version: string;
  date: string | null;
  preRelease?: boolean;
  sections: Partial<Record<SectionName, string[]>>;
};

const SECTION_ORDER: SectionName[] = ['Added', 'Changed', 'Fixed', 'Removed'];

const entries: ChangelogEntry[] = [
  {
    version: 'Unreleased',
    date: null,
    preRelease: true,
    sections: {
      Added: [
        'Permanent guide deletion — right-click and Del / Backspace should clear guides from storage across sessions',
        'Figma plugin — import Calipers measurements directly into a Figma file',
        'Shareable sessions — generate a link that replays a measurement session in another browser',
        'Measurement presets — save and name common measurements (e.g. "8pt grid", "nav height")',
        'Annotations — attach sticky notes to measured elements, exportable as PNG',
        'Accessibility auditing — contrast ratio checker and touch target size validator (WCAG 2.1 AA/AAA)',
        'Changelog diff mode — visually compare how element sizes changed between two page snapshots',
      ],
    },
  },
  {
    version: '0.1.0',
    date: '2026-06-24',
    sections: {
      Added: [
        'Inspect mode — hover any element to see width × height, typography, CSS path, and viewport distances',
        'Measure mode — click two or more elements to see pixel distance between closest edges',
        'Guides mode — place draggable horizontal and vertical alignment guides with snap-to-element edges',
        'Colour picker mode — sample element colours and copy as HEX, RGB, or HSL',
        'Spacing grid mode — show all gaps between sibling elements at once',
        'Box model overlay — colour-coded margin, padding, border, and content rings',
        'Ruler overlay — pixel rulers along viewport edges with cursor crosshair',
        'Design token panel — extract CSS custom properties and export as JSON',
        'Screenshot export — capture the viewport with measurements baked in',
        'Multi-element measurement — pin up to 5 elements; every consecutive pair measured simultaneously',
        'Copy-to-clipboard for all measurements and colour values',
        'Keyboard shortcuts for every mode and tool (1–5, B, D, S, ?, Esc)',
        'Floating control panel with mode switcher and per-mode toggles',
        'Persist guides and settings across sessions via chrome.storage',
        'Firefox extension build with WebExtensions API parity',
        'Companion website with interactive demo, docs, and keyboard shortcut reference',
        'Chrome Web Store listing',
      ],
      Changed: [
        'Redesigned extension panel UI with partial DOM updates for smooth transitions',
        'Migrated UI typography to self-hosted Neue Plak Text and Ashbury font families',
      ],
    },
  },
];

function SectionLabel({ label }: { label: string }): JSX.Element {
  return (
    <h3
      style={{
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#C4C4C4',
        marginBottom: '8px',
        marginTop: '20px',
        scrollMarginTop: '5rem',
      }}
    >
      {label}
    </h3>
  );
}

function VersionBadge(): JSX.Element {
  return (
    <span
      style={{
        fontSize: '10px',
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: '999px',
        background: 'rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.08)',
        color: '#737373',
        letterSpacing: '-0.01em',
      }}
    >
      In development
    </span>
  );
}

export default function ChangelogPage(): JSX.Element {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          margin: '0 auto',
          padding: '80px 24px 120px',
        }}
      >
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: '#000',
            marginBottom: '6px',
          }}
        >
          Changelog
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: '#737373',
            lineHeight: 1.75,
            letterSpacing: '-0.01em',
            marginBottom: '48px',
          }}
        >
          All notable changes to Calipers. Follows{' '}
          <Link
            href="https://keepachangelog.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#000', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
          >
            Keep a Changelog
          </Link>{' '}
          format. Track upcoming work on the{' '}
          <Link
            href={`${GITHUB_URL}/blob/main/ROADMAP.md`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#000', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
          >
            roadmap
          </Link>
          .
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          {entries.map((entry) => (
            <section key={entry.version}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '10px',
                  flexWrap: 'wrap',
                  marginBottom: '4px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                <h2
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: '#000',
                  }}
                >
                  {entry.version === 'Unreleased' ? entry.version : `v${entry.version}`}
                </h2>
                {entry.date && (
                  <time
                    dateTime={entry.date}
                    style={{ fontSize: '12px', color: '#D4D4D4', letterSpacing: '-0.01em' }}
                  >
                    {new Date(`${entry.date}T00:00:00`).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                )}
                {entry.preRelease && <VersionBadge />}
              </div>

              {SECTION_ORDER.map((sectionName) => {
                const items = entry.sections[sectionName];
                if (!items?.length) return null;

                return (
                  <div key={sectionName}>
                    <SectionLabel label={sectionName} />
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {items.map((item) => (
                        <li
                          key={item}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            fontSize: '13px',
                            color: '#737373',
                            lineHeight: 1.75,
                            letterSpacing: '-0.01em',
                            marginBottom: '6px',
                          }}
                        >
                          <span
                            style={{
                              marginTop: '9px',
                              width: '4px',
                              height: '4px',
                              borderRadius: '50%',
                              background: '#D4D4D4',
                              flexShrink: 0,
                            }}
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}
