import type { Metadata } from 'next';
import { Navbar } from '../../components/navbar';
import { Footer } from '../../components/footer';

export const metadata: Metadata = {
  title: 'Changelog',
};

const entries = [
  {
    version: 'Unreleased',
    date: null,
    sections: {
      Added: [
        'Inspect mode — hover to see element dimensions',
        'Measure mode — click two elements to see distance',
        'Guides mode — draggable alignment guides',
        'Box model overlay with colour-coded layers',
        'Screenshot export via chrome.tabs.captureVisibleTab()',
        'Copy-to-clipboard for all measurements',
        'Keyboard shortcuts for all major actions',
        'Glassmorphic popup UI',
        'Companion website (this site)',
      ],
    },
  },
];

export default function ChangelogPage() {
  return (
    <>
      <Navbar />
      <main className="pt-14 min-h-screen">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <h1
            className="text-3xl font-semibold mb-2"
            style={{ letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.9)' }}
          >
            Changelog
          </h1>
          <p className="text-sm mb-12" style={{ color: 'rgba(255,255,255,0.4)' }}>
            All notable changes to Calipers.{' '}
            <a
              href="https://keepachangelog.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#4A9EFF' }}
            >
              Keep a Changelog
            </a>{' '}
            format.
          </p>

          <div className="space-y-12">
            {entries.map((entry) => (
              <div key={entry.version}>
                <div className="flex items-baseline gap-3 mb-6">
                  <h2
                    className="text-xl font-semibold"
                    style={{ color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.01em' }}
                  >
                    {entry.version}
                  </h2>
                  {entry.date && (
                    <span className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {entry.date}
                    </span>
                  )}
                  {!entry.date && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(74,158,255,0.1)',
                        border: '1px solid rgba(74,158,255,0.2)',
                        color: '#4A9EFF',
                      }}
                    >
                      In development
                    </span>
                  )}
                </div>

                {Object.entries(entry.sections).map(([sectionName, items]) => (
                  <div key={sectionName} className="mb-6">
                    <h3
                      className="text-xs font-semibold uppercase tracking-widest mb-3"
                      style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}
                    >
                      {sectionName}
                    </h3>
                    <ul className="space-y-2">
                      {items.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2 text-sm"
                          style={{ color: 'rgba(255,255,255,0.55)' }}
                        >
                          <span
                            className="mt-1.5 w-1 h-1 rounded-full shrink-0"
                            style={{ background: '#4A9EFF' }}
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
