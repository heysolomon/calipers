'use client';
import Link from 'next/link';

const NAV = [
  { label: 'Docs',      href: '/docs' },
  { label: 'Changelog', href: '/changelog' },
  { label: 'GitHub',    href: 'https://github.com/calipers/calipers' },
];

export function Navbar() {
  return (
    <header
      style={{
        position: 'fixed',
        top: 36, // below demo toolbar
        left: 0,
        right: 0,
        zIndex: 100,
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: 'rgba(247,247,247,0.9)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <Link href="/" style={{ fontSize: '13px', fontWeight: 500, color: '#000', textDecoration: 'none', letterSpacing: '-0.02em' }}>
        Calipers
      </Link>

      <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        {NAV.map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            style={{ fontSize: '12px', color: '#737373', textDecoration: 'none', letterSpacing: '-0.01em' }}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
