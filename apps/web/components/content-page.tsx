import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { SiteHeader } from './site-header';
import { Footer } from './footer';
import { CHROME_STORE_URL, GITHUB_URL, SITE_URL } from '../lib/site';

export function sectionLabelStyle() {
  return {
    fontFamily: '"Ashbury", Georgia, "Times New Roman", serif',
    fontSize: '22px',
    fontWeight: 500,
    lineHeight: '29.7px',
    letterSpacing: '-0.01em',
    color: 'var(--text)',
    marginBottom: '8px',
    marginTop: '40px',
  };
}

export function bodyStyle() {
  return {
    fontSize: '16px',
    color: 'var(--text-body)',
    lineHeight: '25.6px',
    letterSpacing: '-0.01em',
  };
}

export function SectionLabel({ label }: { label: string }) {
  return <h2 style={sectionLabelStyle()}>{label}</h2>;
}

export function BodyText({ children }: { children: ReactNode }) {
  return <p style={bodyStyle()}>{children}</p>;
}

export function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="lp-link"
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {children}
    </Link>
  );
}

/** The closing line of a page: where to get it, the way the homepage says it. */
export function InstallCta({ label = 'Install for Chrome →' }: { label?: string }) {
  return (
    <p style={{ ...bodyStyle(), marginTop: '40px', color: 'var(--text-2)' }}>
      <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer" className="lp-link">
        {label.replace(/\s*→$/, '')}
        <span className="sr-only"> (opens in new tab)</span>
      </a>
      , or view the source on{' '}
      <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="lp-link">
        GitHub
        <span className="sr-only"> (opens in new tab)</span>
      </a>
      .
    </p>
  );
}

type ComparisonRow = {
  feature: string;
  raval: string;
  alternative: string;
};

export function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  return (
    <div style={{ overflowX: 'auto', marginTop: '12px' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px',
          lineHeight: '21px',
        }}
      >
        <caption className="sr-only">Feature comparison</caption>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--line)' }}>
            <th scope="col" style={{ textAlign: 'left', padding: '8px 0', color: 'var(--text-2)', fontWeight: 400 }}>Feature</th>
            <th scope="col" style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text)', fontWeight: 500 }}>Raval</th>
            <th scope="col" style={{ textAlign: 'left', padding: '8px 0', color: 'var(--text-2)', fontWeight: 400 }}>Alternative</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.feature} style={{ borderBottom: '1px solid var(--line)' }}>
              <td style={{ padding: '10px 0', color: 'var(--text-2)', verticalAlign: 'top' }}>{row.feature}</td>
              <td style={{ padding: '10px 12px', color: 'var(--text)', verticalAlign: 'top' }}>{row.raval}</td>
              <td style={{ padding: '10px 0', color: 'var(--text-body)', verticalAlign: 'top' }}>{row.alternative}</td>
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
          {title}
        </h1>
        {subtitle && (
          <p style={{ ...bodyStyle(), maxWidth: '60ch', marginBottom: '8px' }}>
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
  const url = `${SITE_URL}${path}`;
  // "Frontend QA with Raval | Raval" says the name twice; such titles stand on their own.
  const named = title.includes('Raval');
  const full = named ? title : `${title} | Raval`;
  return {
    title: named ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: full,
      description,
      url,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: full,
      description,
    },
  };
}
