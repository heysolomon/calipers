'use client';
import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface Feature {
  icon: ReactNode;
  title: string;
  description: string;
  color: string;
}

const features: Feature[] = [
  {
    icon: <InspectIcon />,
    title: 'Inspect Mode',
    description:
      'Hover over any element to instantly see its exact dimensions. Width, height, and position displayed in a clean floating label.',
    color: '#4A9EFF',
  },
  {
    icon: <MeasureIcon />,
    title: 'Measure Distances',
    description:
      'Click two elements to measure the gap between them. Smart edge detection picks the closest edges automatically.',
    color: '#9B8EFF',
  },
  {
    icon: <GuidesIcon />,
    title: 'Alignment Guides',
    description:
      'Place draggable horizontal and vertical guides anywhere on the page. Right-click to remove.',
    color: '#50C88C',
  },
  {
    icon: <BoxModelIcon />,
    title: 'Box Model Overlay',
    description:
      'Visualise margin, padding, border, and content areas with colour-coded overlays pulled directly from computed styles.',
    color: '#FFC850',
  },
  {
    icon: <ScreenshotIcon />,
    title: 'Screenshot Export',
    description:
      'Capture the visible viewport with your measurements baked in. Save as PNG or copy to clipboard instantly.',
    color: '#FF8250',
  },
  {
    icon: <KeyboardIcon />,
    title: 'Keyboard-first',
    description:
      'Every action has a shortcut. Toggle modes, copy measurements, take screenshots — all without touching the mouse.',
    color: '#FF6B9E',
  },
];

export function FeatureGrid() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="py-24 px-6 max-w-6xl mx-auto">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="text-center mb-16"
      >
        <h2
          className="text-3xl sm:text-4xl font-semibold mb-4"
          style={{ letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.9)', textWrap: 'balance' }}
        >
          Everything you need to measure the web
        </h2>
        <p className="text-lg max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.45)', textWrap: 'pretty' }}>
          A complete measurement toolkit built directly into Chrome — no switching apps, no
          screenshots, no guessing.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{
              type: 'spring',
              stiffness: 280,
              damping: 28,
              delay: reduceMotion ? 0 : i * 0.06,
            }}
          >
            <FeatureCard feature={feature} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <div
      className="rounded-xl p-6 h-full group"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)';
      }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
        style={{
          background: `${feature.color}18`,
          border: `1px solid ${feature.color}30`,
          color: feature.color,
        }}
      >
        {feature.icon}
      </div>
      <h3
        className="font-medium text-base mb-2"
        style={{ color: 'rgba(255,255,255,0.87)', letterSpacing: '-0.01em' }}
      >
        {feature.title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {feature.description}
      </p>
    </div>
  );
}

function InspectIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 9h6M9 6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MeasureIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 9h12M3 7v4M15 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GuidesIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2v14M2 9h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BoxModelIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="1" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
      <rect x="4" y="4" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
      <rect x="7" y="7" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.8" />
    </svg>
  );
}

function ScreenshotIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 6a2 2 0 012-2h.5l1-2h7l1 2H16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function KeyboardIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="4" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 8h1M8 8h1M11 8h1M5 11h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
