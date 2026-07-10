import { DocsSidebar } from '../../components/docs-sidebar';
import { DocsMobileNav } from '../../components/docs-mobile-nav';
import { Footer } from '../../components/footer';
import { Navbar } from '../../components/navbar';
import type { ReactNode } from 'react';

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="docs-layout">
        <DocsMobileNav />
        <div className="docs-shell">
          <DocsSidebar />
          <main className="docs-main">
            <article className="docs-prose">{children}</article>
          </main>
        </div>
      </div>
      <Footer />
    </>
  );
}
