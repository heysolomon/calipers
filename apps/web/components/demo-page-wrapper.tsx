'use client';
import { useDemo } from './demo-provider';
import type { ReactNode } from 'react';

const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

export function DemoPageWrapper({ children }: { children: ReactNode }) {
  const { isOpen } = useDemo();

  return (
    /* Outer shell — fills the full viewport, shows toolbar background in the gutters */
    <div
      style={{
        background: '#0f0f0f',
        paddingTop: isOpen ? '44px' : '0',
        transition: `background 0.3s ease, padding-top 0.44s ${EASE}`,
        minHeight: '100vh',
      }}
    >
      {/* Inner page — inset with rounded top corners to look like a scaled-down card */}
      <div
        style={{
          marginLeft: isOpen ? '14px' : '0',
          marginRight: isOpen ? '14px' : '0',
          borderRadius: isOpen ? '12px 12px 0 0' : '0',
          overflow: 'hidden',
          boxShadow: isOpen
            ? '0 -2px 24px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.04)'
            : 'none',
          background: '#F7F7F7',
          minHeight: `calc(100vh - ${isOpen ? '44px' : '0px'})`,
          transition: [
            `margin-left 0.44s ${EASE}`,
            `margin-right 0.44s ${EASE}`,
            `border-radius 0.44s ${EASE}`,
            'box-shadow 0.3s ease',
          ].join(', '),
        }}
      >
        {children}
      </div>
    </div>
  );
}
