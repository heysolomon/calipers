'use client';

import { motion } from 'framer-motion';

export function OpenSourceCallout() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="rounded-2xl p-10 flex flex-col md:flex-row items-center gap-8"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Built in the open
              </span>
            </div>
            <h2
              className="text-2xl font-semibold mb-3"
              style={{ letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.9)' }}
            >
              Open source, forever.
            </h2>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Calipers is MIT-licensed and built transparently on GitHub. All skill levels are
              welcome — whether you want to file a bug, suggest a feature, or send a pull request.
            </p>
            <a
              href="https://github.com/calipers/calipers/blob/main/CONTRIBUTING.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium"
              style={{ color: '#4A9EFF' }}
            >
              Contributing guide →
            </a>
          </div>

          <div className="flex flex-col gap-3 min-w-[160px]">
            <Stat value="MIT" label="License" />
            <Stat value="TypeScript" label="Language" />
            <Stat value="Manifest V3" label="Extension API" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="rounded-lg px-4 py-3 text-center"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="font-semibold text-base" style={{ color: 'rgba(255,255,255,0.85)' }}>
        {value}
      </div>
      <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
        {label}
      </div>
    </div>
  );
}
