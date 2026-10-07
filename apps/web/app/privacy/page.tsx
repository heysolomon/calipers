import type { Metadata } from 'next';
import type { JSX } from 'react';
import { Footer } from '../../components/footer';
import { SiteHeader } from '../../components/site-header';

export const metadata: Metadata = {
  title: 'Privacy Policy',
};

function SectionLabel({ label }: { label: string }): JSX.Element {
  return (
    <h2
      style={{
        fontFamily: '"Ashbury", Georgia, "Times New Roman", serif',
        fontSize: '22px',
        fontWeight: 500,
        lineHeight: '29.7px',
        letterSpacing: '-0.01em',
        color: 'var(--text)',
        marginBottom: '8px',
        marginTop: '40px',
        scrollMarginTop: '2rem',
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
      <SiteHeader nav />

      <div
        style={{
          width: '100%',
          maxWidth: '744px',
          margin: '0 auto',
          padding: '56px 20px 96px',
        }}
      >
        <h1 className="page-title">
          Privacy Policy
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '8px' }}>
          Last updated: June 2026
        </p>

        {/* Overview */}
        <SectionLabel label="Overview" />
        <p style={{ fontSize: '16px', color: 'var(--text-body)', lineHeight: '25.6px', letterSpacing: '-0.01em' }}>
          Raval is a free, open-source browser extension. This policy explains what data we collect,
          store, and transmit — which is as little as possible.
        </p>

        {/* Data we collect */}
        <SectionLabel label="Data we collect" />
        <p style={{ fontSize: '16px', color: 'var(--text-body)', lineHeight: '25.6px', letterSpacing: '-0.01em' }}>
          We collect nothing. Raval does not collect, store, or transmit any personally identifiable
          information, browsing history, or usage data.
        </p>

        {/* Local storage */}
        <SectionLabel label="Local storage" />
        <p style={{ fontSize: '16px', color: 'var(--text-body)', lineHeight: '25.6px', letterSpacing: '-0.01em' }}>
          Raval stores your preferences locally in your browser using{' '}
          <code
            style={{
              background: 'var(--hover)',
              border: '1px solid var(--line-soft)',
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
        <p style={{ fontSize: '16px', color: 'var(--text-body)', lineHeight: '25.6px', letterSpacing: '-0.01em', marginBottom: '12px' }}>
          Raval requests certain browser permissions solely to deliver its core functionality.
          No permission is used to collect or transmit data.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {PERMISSIONS.map(({ permission, description }) => (
            <div key={permission} style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <code
                style={{
                  flexShrink: 0,
                  fontSize: '13px',
                  fontFamily: "'JetBrains Mono', monospace",
                  color: 'var(--text)',
                  background: 'var(--hover)',
                  border: '1px solid var(--line-soft)',
                  borderRadius: '4px',
                  padding: '2px 7px',
                }}
              >
                {permission}
              </code>
              <span style={{ fontSize: '16px', color: 'var(--text-body)', lineHeight: '25.6px', letterSpacing: '-0.01em' }}>
                {description}
              </span>
            </div>
          ))}
        </div>

        {/* Third parties */}
        <SectionLabel label="Third parties" />
        <p style={{ fontSize: '16px', color: 'var(--text-body)', lineHeight: '25.6px', letterSpacing: '-0.01em' }}>
          Raval does not share data with any third party. There are no analytics, no tracking
          scripts, and no external services.
        </p>

        {/* Open source */}
        <SectionLabel label="Open source" />
        <p style={{ fontSize: '16px', color: 'var(--text-body)', lineHeight: '25.6px', letterSpacing: '-0.01em' }}>
          Raval is fully open source. You can inspect every line of code at{' '}
          <a
            href="https://github.com/heysolomon/calipers"
            target="_blank"
            rel="noopener noreferrer"
            className="lp-link"
          >
            github.com/heysolomon/calipers
          </a>{' '}
          and verify these claims yourself.
        </p>

        {/* Contact */}
        <SectionLabel label="Contact" />
        <p style={{ fontSize: '16px', color: 'var(--text-body)', lineHeight: '25.6px', letterSpacing: '-0.01em' }}>
          If you have questions about this policy, open an issue on{' '}
          <a
            href="https://github.com/heysolomon/calipers/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="lp-link"
          >
            GitHub
          </a>{' '}
          or reach out at{' '}
          <a
            href="mailto:akusonsolomon15@gmail.com"
            className="lp-link"
          >
            akusonsolomon15@gmail.com
          </a>
          .
        </p>
      </div>

      <Footer />
    </main>
  );
}
