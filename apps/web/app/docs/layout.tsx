import Link from 'next/link';
import { Navbar } from '../../components/navbar';
import { Footer } from '../../components/footer';

const navItems = [
  {
    section: 'Getting Started',
    items: [{ label: 'Introduction', href: '/docs' }],
  },
  {
    section: 'Features',
    items: [
      { label: 'Inspect Mode', href: '/docs/features/inspect-mode' },
      { label: 'Measure Mode', href: '/docs/features/measure-mode' },
      { label: 'Alignment Guides', href: '/docs/features/guides' },
      { label: 'Box Model', href: '/docs/features/box-model' },
    ],
  },
  {
    section: 'Contributing',
    items: [{ label: 'Contributing Guide', href: '/docs/contributing' }],
  },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="pt-14 min-h-screen flex">
        {/* Sidebar */}
        <aside
          className="hidden md:block w-56 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-8 px-4"
          style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
        >
          {navItems.map((group) => (
            <div key={group.section} className="mb-6">
              <div
                className="text-xs font-semibold uppercase tracking-wider mb-2 px-2"
                style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}
              >
                {group.section}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block px-2 py-1.5 rounded-md text-sm transition-colors"
                      style={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 max-w-3xl mx-auto px-6 py-12">
          <article className="prose">{children}</article>
        </main>
      </div>
      <Footer />
    </>
  );
}
