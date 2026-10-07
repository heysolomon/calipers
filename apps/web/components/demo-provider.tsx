'use client';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/** Same modes as the extension. Colours and box values live inside Inspect. */
export type DemoKey = 'inspect' | 'measure' | 'guides';

/** What the demo cursor should look like, set by the active tool. */
export type DemoCursor = 'crosshair' | 'text' | 'delete' | 'remove' | 'move-x' | 'move-y';

interface DemoCtx {
  isOpen:    boolean;
  inspect:   boolean;
  measure:   boolean;
  guides:    boolean;
  anyTool:   boolean;
  cursor:    DemoCursor;
  setCursor: (c: DemoCursor) => void;
  open:      () => void;
  close:     () => void;
  toggle:    (k: DemoKey) => void;
  reset:     () => void;
}

const Ctx = createContext<DemoCtx | null>(null);
const OFF = { inspect: false, measure: false, guides: false };

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tools, setTools]   = useState(OFF);
  const [cursor, setCursorState] = useState<DemoCursor>('crosshair');

  // Stable identity: tools pass this to effects that must not re-run on every render.
  const setCursor = useCallback((c: DemoCursor) => setCursorState(c), []);

  const value = useMemo<DemoCtx>(() => ({
    isOpen,
    ...tools,
    anyTool: tools.inspect || tools.measure || tools.guides,
    cursor,
    setCursor,
    open:   () => setIsOpen(true),
    close:  () => { setIsOpen(false); setTools(OFF); setCursorState('crosshair'); },
    toggle: (k) => { setCursorState('crosshair'); setTools((p) => (p[k] ? { ...OFF } : { ...OFF, [k]: true })); },
    reset:  () => { setTools(OFF); setCursorState('crosshair'); },
  }), [isOpen, tools, cursor, setCursor]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo(): DemoCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDemo must be inside <DemoProvider>');
  return ctx;
}
