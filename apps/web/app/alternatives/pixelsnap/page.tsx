import type { Metadata } from 'next';
import {
  BodyText,
  buildPageMetadata,
  ComparisonTable,
  ContentPage,
  InlineLink,
  InstallCta,
  SectionLabel,
} from '../../../components/content-page';

export const metadata: Metadata = buildPageMetadata({
  title: 'Raval vs PixelSnap',
  description:
    'Compare Raval and PixelSnap for measuring pixel distances on the web. Raval is a free, open-source Chrome extension with DOM-native accuracy — no screenshots required.',
  path: '/alternatives/pixelsnap',
});

const ROWS = [
  { feature: 'Platform', raval: 'Chrome & Firefox extension', alternative: 'macOS desktop app' },
  { feature: 'Measurement method', raval: 'Direct DOM access on live pages', alternative: 'Screenshot-based' },
  { feature: 'Measure distance between elements', raval: 'Yes — click two or more elements', alternative: 'Yes — on screenshots' },
  { feature: 'Alignment guides', raval: 'Yes — draggable, snap-to-edge', alternative: 'Yes' },
  { feature: 'Box model overlay', raval: 'Yes — margin, padding, border, content', alternative: 'No' },
  { feature: 'Design token extraction', raval: 'Yes — CSS custom properties', alternative: 'No' },
  { feature: 'Works on any webpage', raval: 'Yes — in the browser', alternative: 'Requires screenshot first' },
  { feature: 'Price', raval: 'Free, open source (MIT)', alternative: 'Paid (one-time purchase)' },
  { feature: 'Open source', raval: 'Yes', alternative: 'No' },
];

export default function PixelSnapAlternativePage() {
  return (
    <ContentPage
      title="Raval vs PixelSnap"
      subtitle="PixelSnap is a popular macOS tool for measuring screenshots. Raval brings the same precision to your browser — with direct DOM access and no screenshot step."
    >
      <SectionLabel label="Why developers switch" />
      <BodyText>
        PixelSnap is excellent for measuring static screenshots, but web developers often need to check spacing on
        live pages — after CSS changes, responsive breakpoints, or dynamic content. Raval measures elements
        directly in the DOM, so you always get the real rendered size, not an approximation from a captured image.
      </BodyText>

      <SectionLabel label="Comparison" />
      <ComparisonTable rows={ROWS} />

      <SectionLabel label="When Raval is the better fit" />
      <BodyText>
        Choose Raval when you want to measure spacing on a live webpage without leaving the browser, verify
        responsive layouts at different viewport sizes, inspect box model values alongside distances, or use a
        free open-source tool your whole team can install in seconds.
      </BodyText>

      <SectionLabel label="Related" />
      <BodyText>
        See also{' '}
        <InlineLink href="/alternatives/page-ruler">Raval vs Page Ruler Redux</InlineLink> or read the{' '}
        <InlineLink href="/use-cases/design-handoff">design handoff use case</InlineLink>.
      </BodyText>

      <InstallCta />
    </ContentPage>
  );
}
