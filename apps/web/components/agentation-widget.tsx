'use client';
import dynamic from 'next/dynamic';

const Agentation = dynamic(() => import('agentation').then((mod) => mod.Agentation), {
  ssr: false,
});

export function AgentationWidget() {
  return <Agentation />;
}
