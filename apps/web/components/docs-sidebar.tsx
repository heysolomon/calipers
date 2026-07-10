'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DOC_NAV } from '../lib/docs';

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="docs-sidebar" aria-label="Documentation">
      {DOC_NAV.map((group) => (
        <div key={group.section} className="docs-sidebar-group">
          <div className="docs-sidebar-label">{group.section}</div>
          <ul className="docs-sidebar-list">
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`docs-sidebar-link${active ? ' is-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}
