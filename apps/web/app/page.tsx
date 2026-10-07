import { DemoTrigger } from '../components/demo-trigger';
import { FeatureTiles } from '../components/feature-tiles';
import { HeroDemo } from '../components/hero-demo';
import Link from 'next/link';
import { Footer } from '../components/footer';
import { SiteHeader } from '../components/site-header';
import { CHROME_STORE_URL } from '../lib/site';

// ─── Data ─────────────────────────────────────────────────────────────────────

/** Who it is for, and the three things each of them gets from it. */
// Kept short: three cards share one row.
const AUDIENCES: { name: string; use: string; text: string; points: string[] }[] = [
  {
    name: 'Designers',
    use: 'Design review and handoff',
    text: 'Check the build against the design without opening DevTools.',
    points: ['Read sizes, type and colours', 'Measure the gap between elements', 'Mark up what is off and screenshot it'],
  },
  {
    name: 'Design engineers',
    use: 'Studying a site',
    text: 'Take apart a site you admire and see how it was put together.',
    points: ['See the fonts, sizes and colours it uses', 'Read its spacing and layout at a glance', 'Pull out its design tokens'],
  },
  {
    name: 'Developers',
    use: 'Frontend QA',
    text: 'Verify spacing and alignment while you build.',
    points: ['Pixel distances, straight from the DOM', 'Guides that snap to element edges', 'Design tokens exported as JSON'],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="lp">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <SiteHeader />

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="lp-hero">
        <h1 className="lp-display">Measure, inspect and annotate any webpage</h1>
        <div className="lp-hero-copy">
          <p>Calipers is a free, open-source browser extension for designers and developers.</p>
          <p>
            Install it for{' '}
            <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer" className="lp-link">
              Chrome<span className="sr-only"> (opens in new tab)</span>
            </a>
            , or <DemoTrigger variant="link" /> on this page.
          </p>
        </div>
      </section>

      {/* ── Showcase ───────────────────────────────────────────────────────── */}
      <section className="lp-showcase" aria-label="How Calipers works">
        <div className="lp-grid">
          <div className="lp-frame lp-frame-demo">
            <HeroDemo />
          </div>
        </div>
        <div className="lp-grid">
          <div className="lp-frame lp-frame-tiles">
            <FeatureTiles />
          </div>
        </div>
      </section>

      {/* ── Approach ───────────────────────────────────────────────────────── */}
      <section className="lp-grid lp-approach">
        <div className="lp-column">
          <h2 className="lp-heading">How it works</h2>
          <div className="lp-prose">
            <p>
              Calipers reads the page itself, not a picture of it, so every size, gap and colour is
              the value the browser is actually using.
            </p>
            <p>
              Open it on any page and a small toolbar appears. Press 1 to 4 to switch between
              Inspect, Measure, Guides and Annotate, and ? to see every shortcut.
            </p>
            <p>
              It is MIT licensed, collects no data and runs entirely in your browser. Start with the{' '}
              <Link href="/docs" className="lp-link">documentation</Link>.
            </p>
          </div>

          <div className="lp-cards">
            {AUDIENCES.map(({ name, use, text, points }) => (
              <div key={name} className="lp-card">
                <div>
                  <h3>{name}</h3>
                  <p className="lp-card-use">{use}</p>
                </div>
                <p>{text}</p>
                <ul>
                  {points.map((point) => (
                    <li key={point}>
                      <img src="/icons/check.svg" alt="" width={15} height={15} />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="lp-closing">
            Get it on the{' '}
            <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer" className="lp-link">
              Chrome Web Store<span className="sr-only"> (opens in new tab)</span>
            </a>
          </p>
        </div>
      </section>

      <div className="lp-footer">
        <Footer />
      </div>
    </main>
  );
}
