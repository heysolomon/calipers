'use client';
import { createContext, useContext, useState } from 'react';

export type DemoKey = 'inspect' | 'boxmodel' | 'measure' | 'guides' | 'colorpicker' | 'spacing';

interface DemoCtx {
  isOpen:      boolean;
  inspect:     boolean;
  boxmodel:    boolean;
  measure:     boolean;
  guides:      boolean;
  colorpicker: boolean;
  spacing:     boolean;
  anyTool:     boolean;
  open:        () => void;
  close:       () => void;
  toggle:      (k: DemoKey) => void;
  reset:       () => void;
}

const Ctx = createContext<DemoCtx | null>(null);
const OFF = { inspect: false, boxmodel: false, measure: false, guides: false, colorpicker: false, spacing: false };

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tools, setTools]   = useState(OFF);

  const open  = () => setIsOpen(true);
  const close = () => { setIsOpen(false); setTools(OFF); };

  function toggle(k: DemoKey) {
    setTools(p => ({ ...p, [k]: !p[k] }));
  }

  function reset() { setTools(OFF); }

  const anyTool = tools.inspect || tools.boxmodel || tools.measure || tools.guides || tools.colorpicker || tools.spacing;

  return (
    <Ctx.Provider value={{ isOpen, ...tools, anyTool, open, close, toggle, reset }}>
      {children}
    </Ctx.Provider>
  );
}

export function useDemo(): DemoCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDemo must be inside <DemoProvider>');
  return ctx;
}
