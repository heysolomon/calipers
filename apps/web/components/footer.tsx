import Link from 'next/link';

export function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid rgba(0,0,0,0.06)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: '#D4D4D4',
        letterSpacing: '-0.01em',
      }}
    >
      <span>MIT License</span>

      <nav style={{ display: 'flex', gap: '16px' }}>
        {[
          { label: 'Docs',      href: '/docs' },
          { label: 'Changelog', href: '/changelog' },
          { label: 'GitHub',    href: 'https://github.com/calipers/calipers' },
        ].map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            style={{ color: '#737373', textDecoration: 'none' }}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>

      <span>v0.1.0</span>
    </footer>
  );
}
