'use client';

import { motion } from 'framer-motion';

export function InstallCTA() {
  return (
    <section id="install" className="py-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="max-w-2xl mx-auto text-center rounded-2xl p-12"
        style={{
          background: 'rgba(74,158,255,0.05)',
          border: '1px solid rgba(74,158,255,0.15)',
          boxShadow: '0 0 60px rgba(74,158,255,0.06)',
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl mx-auto mb-6 flex items-center justify-center"
          style={{
            background: 'rgba(74,158,255,0.12)',
            border: '1px solid rgba(74,158,255,0.25)',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 4v12m0 0l-4-4m4 4l4-4"
              stroke="#4A9EFF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 20h16"
              stroke="#4A9EFF"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <h2
          className="text-3xl font-semibold mb-3"
          style={{ letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.92)' }}
        >
          Ready to measure?
        </h2>
        <p className="mb-8 text-base" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Install Calipers from the Chrome Web Store — it&apos;s free, open source, and takes 10 seconds.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="#"
            className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm w-full sm:w-auto justify-center transition-all"
            style={{
              background: '#4A9EFF',
              color: '#0f0f14',
              boxShadow: '0 0 24px rgba(74,158,255,0.35)',
            }}
          >
            Add to Chrome — it&apos;s free
          </a>
          <a
            href="/docs"
            className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-medium text-sm w-full sm:w-auto justify-center transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            Read the docs
          </a>
        </div>

        <p className="mt-6 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
          No account required · Works on any website · Manifest V3
        </p>
      </motion.div>
    </section>
  );
}
