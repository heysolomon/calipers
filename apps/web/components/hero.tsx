'use client';

import { motion } from 'framer-motion';

const SPRING_SETTLE = { type: 'spring', stiffness: 300, damping: 30 };
const SPRING_BOUNCE = { type: 'spring', stiffness: 400, damping: 20 };

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Dot grid background */}
      <div
        className="absolute inset-0 dot-grid opacity-60"
        style={{ backgroundSize: '28px 28px' }}
      />

      {/* Radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(74,158,255,0.18) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_SETTLE, delay: 0.1 }}
          className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{
            background: 'rgba(74,158,255,0.1)',
            border: '1px solid rgba(74,158,255,0.2)',
            color: '#4A9EFF',
            letterSpacing: '0.02em',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-accent"
            style={{ boxShadow: '0 0 6px rgba(74,158,255,0.6)' }}
          />
          Open source · Free forever
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_SETTLE, delay: 0.2 }}
          className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight mb-6"
          style={{
            color: 'rgba(255,255,255,0.92)',
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
          }}
        >
          Precision measurement
          <br />
          <span style={{ color: '#4A9EFF' }}>for the web.</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_SETTLE, delay: 0.35 }}
          className="text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          Inspect dimensions, measure distances, and check alignment on any webpage — directly in
          Chrome, with pixel-perfect accuracy.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_BOUNCE, delay: 0.5 }}
          className="flex items-center justify-center gap-3 flex-wrap"
        >
          <a
            href="#install"
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all"
            style={{
              background: '#4A9EFF',
              color: '#0f0f14',
              boxShadow: '0 0 24px rgba(74,158,255,0.3)',
              fontWeight: 600,
            }}
          >
            <ChromeIcon />
            Install for Chrome
          </a>
          <a
            href="https://github.com/calipers/calipers"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <GitHubIcon />
            View on GitHub
          </a>
        </motion.div>

        {/* Demo image placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...SPRING_SETTLE, delay: 0.7 }}
          className="mt-16 rounded-2xl overflow-hidden mx-auto max-w-3xl"
          style={{
            background: 'rgba(26,26,36,0.8)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow:
              '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), 0 0 60px rgba(74,158,255,0.06)',
            aspectRatio: '16/9',
          }}
        >
          <DemoPlaceholder />
        </motion.div>
      </div>
    </section>
  );
}

function DemoPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ minHeight: '360px' }}>
      <div className="text-center space-y-3">
        <div
          className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center"
          style={{ background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.2)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="#4A9EFF" strokeWidth="1.5" />
            <path d="M3 9h18M9 3v18" stroke="#4A9EFF" strokeWidth="1.5" strokeOpacity="0.5" />
            <rect x="9" y="9" width="6" height="6" fill="rgba(74,158,255,0.2)" stroke="#4A9EFF" strokeWidth="1" />
          </svg>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
          Demo coming soon — place <code style={{ color: '#4A9EFF' }}>docs/assets/demo.gif</code>
        </p>
      </div>
    </div>
  );
}

function ChromeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 2c1.7 0 3.3.5 4.6 1.4L12 12 7.4 5.4A8 8 0 0112 4zm-8 8c0-1.7.5-3.3 1.4-4.6L12 12l-6 0A8 8 0 014 12zm8 8a8 8 0 01-6.6-3.4L12 12l4.6 6.6A8 8 0 0112 20zm2.6-1.4L12 12l6 0a8 8 0 01-3.4 6.6z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
