import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Navbar } from './navbar';
import { Footer } from './footer';
import { CHROME_STORE_URL, GITHUB_URL } from '../lib/site';

export function sectionLabelStyle() {
  return {
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: '#C4C4C4',
    marginBottom: '8px',
    marginTop: '28px',
  };
}

export function bodyStyle() {
  return {
    fontSize: '13px',
    color: '#737373',
    lineHeight: 1.75,
    letterSpacing: '-0.01em',
  };
}

export function SectionLabel({ label }: { label: string }) {
  return <p style={sectionLabelStyle()}>{label}</p>;
}

export function BodyText({ children }: { children: ReactNode }) {
  return <p style={bodyStyle()}>{children}</p>;
}

export function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      style={{ color: '#000', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {children}
    </Link>
  );
}

export function InstallCta({ label = 'Install for Chrome →' }: { label?: string }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '24px' }}>
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
        {label}
        <span className="sr-only"> (opens in new tab)</span>
      </a>
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="site-link"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: '12px',
          fontWeight: 500,
          color: '#000',
          background: '#fff',
          padding: '7px 16px',
          borderRadius: '6px',
          textDecoration: 'none',
          letterSpacing: '-0.01em',
          border: '1px solid rgba(0,0,0,0.1)',
        }}
      >
        View on GitHub
        <span className="sr-only"> (opens in new tab)</span>
      </a>
    </div>
  );
}

type ComparisonRow = {
  feature: string;
  calipers: string;
  alternative: string;
};

export function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  return (
    <div style={{ overflowX: 'auto', marginTop: '12px' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '12px',
          letterSpacing: '-0.01em',
        }}
      >
        <caption className="sr-only">Feature comparison</caption>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
            <th scope="col" style={{ textAlign: 'left', padding: '8px 0', color: '#C4C4C4', fontWeight: 600 }}>Feature</th>
            <th scope="col" style={{ textAlign: 'left', padding: '8px 12px', color: '#000', fontWeight: 600 }}>Calipers</th>
            <th scope="col" style={{ textAlign: 'left', padding: '8px 0', color: '#737373', fontWeight: 600 }}>Alternative</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.feature} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <td style={{ padding: '10px 0', color: '#737373', verticalAlign: 'top' }}>{row.feature}</td>
              <td style={{ padding: '10px 12px', color: '#000', verticalAlign: 'top' }}>{row.calipers}</td>
              <td style={{ padding: '10px 0', color: '#737373', verticalAlign: 'top' }}>{row.alternative}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ContentPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
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
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: '13px', color: '#737373', lineHeight: 1.75, letterSpacing: '-0.01em', marginBottom: '32px' }}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
      <Footer />
    </main>
  );
}

export function buildPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = `https://calipers.solomonakuson.com${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | Calipers`,
      description,
      url,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Calipers`,
      description,
    },
  };
}
