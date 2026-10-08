import type { Metadata } from 'next';
import { HeroDemo, type DemoScene } from '../../components/hero-demo';

// A bare stage for recording the scripted demo as video: 1280 × 720 with the demo centred.
//   /record                      the whole script
//   /record?scenes=inspect,measure
// Not linked from anywhere and not indexed.
export const metadata: Metadata = { title: 'Demo recording', robots: { index: false, follow: false } };

const SCENES: DemoScene[] = ['inspect', 'measure', 'guides', 'annotate', 'screenshot'];

export default async function RecordPage({ searchParams }: { searchParams: Promise<{ scenes?: string }> }) {
  const asked = (await searchParams).scenes?.split(',') ?? [];
  const scenes = SCENES.filter((scene) => asked.includes(scene));

  return (
    <main style={{ width: 1280, height: 720, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', overflow: 'hidden' }}>
      <div style={{ width: 1030 }}>
        <HeroDemo scenes={scenes.length > 0 ? scenes : SCENES} />
      </div>
    </main>
  );
}
