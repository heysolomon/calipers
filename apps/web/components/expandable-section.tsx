'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export interface SectionRow {
  id: string;
  leftBadge?: string;    // kbd prefix on the left (modes)
  left: string;
  right: string;
  rightIsKbd?: boolean;  // render right column as kbd (shortcuts)
  rowPadding?: string;
}

interface Props {
  items: SectionRow[];
  initialCount: number;
  showMoreLabel?: string;
}

const EASE_OUT_CUBIC: [number, number, number, number] = [0.215, 0.61, 0.355, 1];

function Divider() {
  return <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)' }} />;
}

function Row({ leftBadge, left, right, rightIsKbd, rowPadding = '9px 0' }: Omit<SectionRow, 'id'>) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: rightIsKbd ? 'center' : 'baseline',
        gap: '16px',
        padding: rowPadding,
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: rightIsKbd ? '#737373' : '#000',
          letterSpacing: '-0.01em',
          flexShrink: 0,
        }}
      >
        {leftBadge && (
          <kbd
            style={{
              fontSize: '9px',
              fontFamily: '"JetBrains Mono", monospace',
              color: '#737373',
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.12)',
              borderBottomWidth: '2px',
              borderRadius: '3px',
              padding: '1px 5px',
            }}
          >
            {leftBadge}
          </kbd>
        )}
        {left}
      </span>

      {rightIsKbd ? (
        <kbd
          style={{
            fontSize: '10px',
            fontFamily: '"JetBrains Mono", monospace',
            color: '#000',
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.12)',
            borderBottomWidth: '2px',
            borderRadius: '4px',
            padding: '1px 7px',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          {right}
        </kbd>
      ) : (
        <span style={{ fontSize: '11.5px', color: '#999', textAlign: 'right', lineHeight: 1.5 }}>
          {right}
        </span>
      )}
    </div>
  );
}

export function ExpandableSection({ items, initialCount, showMoreLabel = 'items' }: Props) {
  const [expanded, setExpanded] = useState(false);
  const reduce = useReducedMotion();

  const always = items.slice(0, initialCount);
  const hidden = items.slice(initialCount);

  return (
    <div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {always.map((item, i) => (
          <li key={item.id}>
            <Row {...item} />
            {(expanded || i < always.length - 1) && <Divider />}
          </li>
        ))}

        <AnimatePresence initial={false}>
          {expanded &&
            hidden.map((item, i) => (
              <motion.li
                key={item.id}
                initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: EASE_OUT_CUBIC, delay: i * 0.05 }}
              >
                <Row {...item} />
                {i < hidden.length - 1 && <Divider />}
              </motion.li>
            ))}
        </AnimatePresence>
      </ul>

      <AnimatePresence initial={false}>
        {!expanded && hidden.length > 0 && (
          <motion.button
            onClick={() => setExpanded(true)}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.1, ease: 'easeIn' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#737373'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#C4C4C4'; }}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px 0 0',
              cursor: 'pointer',
              fontSize: '11.5px',
              color: '#C4C4C4',
              letterSpacing: '-0.01em',
              transition: 'color 150ms ease',
            }}
          >
            Show {hidden.length} more {showMoreLabel} ↓
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
