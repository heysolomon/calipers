import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '../../components/content-page';
import { DOC_NAV } from '../../lib/docs';
import { CHROME_STORE_URL, GITHUB_URL } from '../../lib/site';

export const metadata: Metadata = buildPageMetadata({
  title: 'Documentation',
  description:
    'Learn how to install and use Calipers — the free Chrome extension for measuring distances, inspecting dimensions, and checking alignment on any webpage.',
  path: '/docs',
});

export default function DocsIndexPage() {
  return (
    <>
      <h1>Getting Started with Calipers</h1>
      <p className="docs-lead">
        Calipers is a free, open-source browser extension that lets designers and developers
        instantly measure distances, inspect dimensions, and check alignment on any webpage.
        Think PixelSnap, but for the browser — with direct DOM access for pixel-perfect accuracy.
      </p>

      <h2>Install</h2>
      <p>
        The fastest way to get started is the{' '}
        <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer">
          Chrome Web Store
        </a>
        . Click <strong>Add to Chrome</strong>, then press <code>Cmd+Shift+M</code> (Mac) or{' '}
        <code>Ctrl+Shift+M</code> (Windows/Linux) to activate on any page.
      </p>
      <p>
        Prefer to build from source? See the full{' '}
        <Link href="/docs/getting-started/installation">installation guide</Link>.
      </p>

      <h2>Quick Tour</h2>
      <h3>Activate Calipers</h3>
      <p>
        Press <code>Cmd+Shift+M</code> / <code>Ctrl+Shift+M</code> to toggle Calipers on the
        current page. A floating control panel appears in the top-right corner with the mode
        switcher and contextual settings.
      </p>

      <h3>Five Measurement Modes</h3>
      <ul>
        <li>
          <strong>Inspect (1)</strong> — Hover elements to see dimensions, typography, CSS path,
          and viewport distances.
        </li>
        <li>
          <strong>Measure (2)</strong> — Click elements to measure pixel distance between closest
          edges. Pin up to five at once.
        </li>
        <li>
          <strong>Guides (3)</strong> — Place draggable alignment guides with snap-to-element edges.
        </li>
        <li>
          <strong>Colour picker (4)</strong> — Sample colours and copy as HEX, RGB, or HSL.
        </li>
        <li>
          <strong>Spacing grid (5)</strong> — Show all gaps between sibling elements at once.
        </li>
      </ul>

      <h3>Tools &amp; Overlays</h3>
      <ul>
        <li>
          <strong>Box model (B)</strong> — Colour-coded margin, padding, border, and content rings.
        </li>
        <li>
          <strong>Rulers</strong> — Pixel rulers along viewport edges with cursor crosshair.
        </li>
        <li>
          <strong>Design tokens (D)</strong> — Extract CSS custom properties and export as JSON.
        </li>
        <li>
          <strong>Screenshot (S)</strong> — Export the viewport with measurements baked in.
        </li>
      </ul>

      <h2>Documentation</h2>
      <div className="docs-nav-grid">
        {DOC_NAV.map((group) => (
          <div key={group.section} className="docs-nav-card">
            <h3>{group.section}</h3>
            <ul>
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <h2>Resources</h2>
      <ul>
        <li>
          <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer">
            Install from Chrome Web Store
          </a>
        </li>
        <li>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            Source code on GitHub
          </a>
        </li>
        <li>
          <Link href="/changelog">Changelog</Link>
        </li>
        <li>
          <Link href="/use-cases/frontend-qa">Frontend QA workflow</Link>
        </li>
        <li>
          <Link href="/use-cases/design-handoff">Design handoff workflow</Link>
        </li>
      </ul>
    </>
  );
}
