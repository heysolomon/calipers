import type { Metadata } from 'next';
import type { JSX } from 'react';
import Link from 'next/link';
import { Navbar } from '../../components/navbar';

export const metadata: Metadata = {
  title: 'Privacy Policy',
};

function SectionLabel({ label }: { label: string }): JSX.Element {
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

const PERMISSIONS = [
  { permission: 'activeTab',  description: 'to inject the measurement overlay into the page you are currently viewing' },
  { permission: 'scripting',  description: 'to run the measurement tools on the active tab' },
  { permission: 'storage',    description: 'to save your preferences locally' },
  { permission: 'tabs',       description: 'to capture a screenshot when you use the export feature' },
];

export default function PrivacyPage(): JSX.Element {
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
          Privacy Policy
        </h1>
        <p style={{ fontSize: '12px', color: '#D4D4D4', marginBottom: '48px', letterSpacing: '-0.01em' }}>
          Last updated: June 2026
        </p>

        {/* Overview */}
        <SectionLabel label="Overview" />
        <p style={{ fontSize: '13px', color: '#737373', lineHeight: 1.75, letterSpacing: '-0.01em' }}>
          Calipers is a free, open-source browser extension. This policy explains what data we collect,
          store, and transmit — which is as little as possible.
        </p>

        {/* Data we collect */}
        <SectionLabel label="Data we collect" />
        <p style={{ fontSize: '13px', color: '#737373', lineHeight: 1.75, letterSpacing: '-0.01em' }}>
          We collect nothing. Calipers does not collect, store, or transmit any personally identifiable
          information, browsing history, or usage data.
        </p>

        {/* Local storage */}
        <SectionLabel label="Local storage" />
        <p style={{ fontSize: '13px', color: '#737373', lineHeight: 1.75, letterSpacing: '-0.01em' }}>
          Calipers stores your preferences locally in your browser using{' '}
          <code
            style={{
              background: 'rgba(0,0,0,0.05)',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: '3px',
              padding: '0.1em 0.35em',
              fontSize: '0.875em',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            chrome.storage
          </code>
          {' '}— things like your last active mode and guide positions. This data never leaves your
          device and is not accessible to us or any third party.
        </p>

        {/* Permissions */}
        <SectionLabel label="Permissions" />
        <p style={{ fontSize: '13px', color: '#737373', lineHeight: 1.75, letterSpacing: '-0.01em', marginBottom: '12px' }}>
          Calipers requests certain browser permissions solely to deliver its core functionality.
          No permission is used to collect or transmit data.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {PERMISSIONS.map(({ permission, description }) => (
            <div key={permission} style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <code
                style={{
                  flexShrink: 0,
                  fontSize: '11px',
                  fontFamily: "'JetBrains Mono', monospace",
                  color: '#000',
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '4px',
                  padding: '2px 7px',
                }}
              >
                {permission}
              </code>
              <span style={{ fontSize: '13px', color: '#737373', lineHeight: 1.6, letterSpacing: '-0.01em' }}>
                {description}
              </span>
            </div>
          ))}
        </div>

        {/* Third parties */}
        <SectionLabel label="Third parties" />
        <p style={{ fontSize: '13px', color: '#737373', lineHeight: 1.75, letterSpacing: '-0.01em' }}>
          Calipers does not share data with any third party. There are no analytics, no tracking
          scripts, and no external services.
        </p>

        {/* Open source */}
        <SectionLabel label="Open source" />
        <p style={{ fontSize: '13px', color: '#737373', lineHeight: 1.75, letterSpacing: '-0.01em' }}>
          Calipers is fully open source. You can inspect every line of code at{' '}
          <a
            href="https://github.com/heysolomon/calipers"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#000', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
          >
            github.com/heysolomon/calipers
          </a>{' '}
          and verify these claims yourself.
        </p>

        {/* Contact */}
        <SectionLabel label="Contact" />
        <p style={{ fontSize: '13px', color: '#737373', lineHeight: 1.75, letterSpacing: '-0.01em' }}>
          If you have questions about this policy, open an issue on{' '}
          <a
            href="https://github.com/heysolomon/calipers/issues"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#000', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
          >
            GitHub
          </a>{' '}
          or reach out at{' '}
          <a
            href="mailto:akusonsolomon15@gmail.com"
            style={{ color: '#000', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
          >
            akusonsolomon15@gmail.com
          </a>
          .
        </p>
      </div>

      {/* Footer */}
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
            { label: 'Docs',      href: '/docs' },
            { label: 'Changelog', href: '/changelog' },
            { label: 'Privacy',   href: '/privacy' },
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
