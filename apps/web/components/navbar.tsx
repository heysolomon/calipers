'use client';

import Link from 'next/link';
import { useState } from 'react';

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(15, 15, 20, 0.7)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <nav className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: '#4A9EFF', boxShadow: '0 0 8px rgba(74,158,255,0.5)' }}
          />
          <span
            className="font-semibold text-sm"
            style={{ color: 'rgba(255,255,255,0.87)', letterSpacing: '-0.01em' }}
          >
            Calipers
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-6">
          {[
            { label: 'Docs', href: '/docs' },
            { label: 'Changelog', href: '/changelog' },
            { label: 'GitHub', href: 'https://github.com/calipers/calipers' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-sm transition-colors"
              style={{ color: 'rgba(255,255,255,0.45)' }}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
            >
              {label}
            </a>
          ))}
          <a
            href="#install"
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: 'rgba(74,158,255,0.12)',
              border: '1px solid rgba(74,158,255,0.2)',
              color: '#4A9EFF',
            }}
          >
            Install
          </a>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="sm:hidden p-2 rounded-lg"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ color: 'rgba(255,255,255,0.5)' }}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            {menuOpen ? (
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              />
            ) : (
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
              />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="sm:hidden px-6 pb-4 flex flex-col gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {[
            { label: 'Docs', href: '/docs' },
            { label: 'Changelog', href: '/changelog' },
            { label: 'GitHub', href: 'https://github.com/calipers/calipers' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-sm py-2"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              {label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
