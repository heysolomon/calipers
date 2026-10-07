'use client';
import { useDemo } from './demo-provider';
import { useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';
const RADIUS = 12;

export function DemoPageWrapper({ children }: { children: ReactNode }) {
  const { isOpen } = useDemo();
  const reduceMotion = useReducedMotion();

  const transition = reduceMotion
    ? 'none'
    : [
        `margin-left 0.44s ${EASE}`,
        `margin-right 0.44s ${EASE}`,
        `border-radius 0.44s ${EASE}`,
        'box-shadow 0.3s ease',
        `background 0.3s ease`,
        `padding-top 0.44s ${EASE}`,
      ].join(', ');

  return (
    <div
      style={{
        background: 'var(--frame)',
        paddingTop: isOpen ? '44px' : '0',
        transition: reduceMotion ? 'none' : `background 0.3s ease, padding-top 0.44s ${EASE}`,
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          marginLeft: isOpen ? '14px' : '0',
          marginRight: isOpen ? '14px' : '0',
          borderRadius: isOpen ? `${RADIUS}px ${RADIUS}px 0 0` : '0',
          overflow: 'hidden',
          boxShadow: isOpen
            ? '0 -2px 24px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.04)'
            : 'none',
          background: 'var(--bg)',
          minHeight: `calc(100vh - ${isOpen ? '44px' : '0px'})`,
          transition,
        }}
      >
        {children}
      </div>
      {/* The card's own corners scroll away with the page; these stay put under the toolbar. */}
      {(['left', 'right'] as const).map((side) => (
        <div
          key={side}
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: '44px',
            [side]: '14px',
            width: `${RADIUS}px`,
            height: `${RADIUS}px`,
            zIndex: 9998,
            pointerEvents: 'none',
            background: `radial-gradient(circle at ${side === 'left' ? '100%' : '0'} 100%, transparent ${RADIUS - 0.5}px, var(--frame) ${RADIUS}px)`,
            opacity: isOpen ? 1 : 0,
            transition: reduceMotion ? 'none' : `opacity 0.2s ease ${isOpen ? '0.3s' : '0s'}`,
          }}
        />
      ))}
    </div>
  );
}
