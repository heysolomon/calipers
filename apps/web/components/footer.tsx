import Link from 'next/link';

const LINKS = [
  { label: 'Docs',         href: '/docs' },
  { label: 'Use Cases',    href: '/use-cases/frontend-qa' },
  { label: 'Alternatives', href: '/alternatives/page-ruler' },
  { label: 'Changelog',    href: '/changelog' },
  { label: 'Privacy',      href: '/privacy' },
  { label: 'GitHub',       href: 'https://github.com/heysolomon/calipers', external: true },
] as const;

export function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid rgba(0,0,0,0.06)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px 16px',
        fontSize: '11px',
        color: '#D4D4D4',
        letterSpacing: '-0.01em',
      }}
    >
      <span>MIT License</span>

      <nav aria-label="Footer" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {LINKS.map(({ label, href, ...rest }) => {
          const external = 'external' in rest && rest.external;
          return (
            <Link
              key={label}
              href={href}
              className="site-link"
              style={{ color: '#737373' }}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
            >
              {label}
              {external && <span className="sr-only"> (opens in new tab)</span>}
            </Link>
          );
        })}
      </nav>

      <span>v0.1.0</span>
    </footer>
  );
}
