import { Navbar } from '../components/navbar';
import { Hero } from '../components/hero';
import { FeatureGrid } from '../components/feature-grid';
import { KeyboardShortcuts } from '../components/keyboard-shortcuts';
import { OpenSourceCallout } from '../components/open-source-callout';
import { InstallCTA } from '../components/install-cta';
import { Footer } from '../components/footer';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="pt-14">
        <Hero />
        <FeatureGrid />
        <KeyboardShortcuts />
        <OpenSourceCallout />
        <InstallCTA />
      </main>
      <Footer />
    </>
  );
}
