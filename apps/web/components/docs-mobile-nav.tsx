'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DOC_NAV } from '../lib/docs';

export function DocsMobileNav() {
  const pathname = usePathname();
  const allItems = DOC_NAV.flatMap((group) => group.items);

  return (
    <nav
      aria-label="Documentation"
      className="md:hidden sticky top-[44px] z-10 overflow-x-auto px-4 py-3"
      style={{
        background: '#F7F7F7',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'manipulation',
      }}
    >
      <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
        {allItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="site-link"
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '999px',
                whiteSpace: 'nowrap',
                color: active ? '#000' : '#737373',
                background: active ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.03)',
                border: '1px solid rgba(0,0,0,0.06)',
                fontWeight: active ? 500 : 400,
                textDecoration: 'none',
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
