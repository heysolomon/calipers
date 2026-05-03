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
      <div style={{ paddingTop: '80px' }} className="min-h-screen flex">
        {/* Sidebar */}
        <aside
          className="hidden md:block w-56 shrink-0 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto py-8 px-4"
          style={{ borderRight: '1px solid rgba(0,0,0,0.06)' }}
        >
          {navItems.map((group) => (
            <div key={group.section} className="mb-6">
              <div
                className="text-xs font-semibold uppercase tracking-wider mb-2 px-2"
                style={{ color: '#D4D4D4', letterSpacing: '0.08em' }}
              >
                {group.section}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block px-2 py-1.5 rounded-md text-sm transition-colors"
                      style={{ color: '#737373' }}
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
