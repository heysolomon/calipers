'use client';

import { motion } from 'framer-motion';

const shortcuts = [
  { keys: ['⌘', '⇧', 'M'], description: 'Toggle Calipers on/off', platform: '/ Ctrl+Shift+M' },
  { keys: ['1'], description: 'Switch to Inspect mode' },
  { keys: ['2'], description: 'Switch to Measure mode' },
  { keys: ['3'], description: 'Switch to Guides mode' },
  { keys: ['B'], description: 'Toggle box model overlay' },
  { keys: ['C'], description: 'Copy current measurement' },
  { keys: ['S'], description: 'Take screenshot' },
  { keys: ['Esc'], description: 'Deactivate / cancel' },
];

export function KeyboardShortcuts() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="text-center mb-12"
        >
          <h2
            className="text-3xl font-semibold mb-3"
            style={{ letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.9)' }}
          >
            Keyboard-first
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1rem' }}>
            Every action has a shortcut. Keep your hands on the keyboard.
          </p>
        </motion.div>

        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {shortcuts.map((shortcut, i) => (
            <motion.div
              key={shortcut.description}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                delay: i * 0.05,
              }}
              className="flex items-center justify-between px-5 py-3.5"
              style={{
                borderBottom:
                  i < shortcuts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}
            >
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1.5">
                {shortcut.keys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
                {shortcut.platform && (
                  <span
                    className="text-xs ml-1"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    {shortcut.platform}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex items-center justify-center rounded text-xs font-medium px-2 py-1 min-w-[28px]"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderBottom: '2px solid rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.7)',
        fontFamily: 'inherit',
        fontSize: '12px',
      }}
    >
      {children}
    </kbd>
  );
}
