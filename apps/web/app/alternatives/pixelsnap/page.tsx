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
  title: 'Calipers vs PixelSnap',
  description:
    'Compare Calipers and PixelSnap for measuring pixel distances on the web. Calipers is a free, open-source Chrome extension with DOM-native accuracy — no screenshots required.',
  path: '/alternatives/pixelsnap',
});

const ROWS = [
  { feature: 'Platform', calipers: 'Chrome & Firefox extension', alternative: 'macOS desktop app' },
  { feature: 'Measurement method', calipers: 'Direct DOM access on live pages', alternative: 'Screenshot-based' },
  { feature: 'Measure distance between elements', calipers: 'Yes — click two or more elements', alternative: 'Yes — on screenshots' },
  { feature: 'Alignment guides', calipers: 'Yes — draggable, snap-to-edge', alternative: 'Yes' },
  { feature: 'Box model overlay', calipers: 'Yes — margin, padding, border, content', alternative: 'No' },
  { feature: 'Design token extraction', calipers: 'Yes — CSS custom properties', alternative: 'No' },
  { feature: 'Works on any webpage', calipers: 'Yes — in the browser', alternative: 'Requires screenshot first' },
  { feature: 'Price', calipers: 'Free, open source (MIT)', alternative: 'Paid (one-time purchase)' },
  { feature: 'Open source', calipers: 'Yes', alternative: 'No' },
];

export default function PixelSnapAlternativePage() {
  return (
    <ContentPage
      title="Calipers vs PixelSnap"
      subtitle="PixelSnap is a popular macOS tool for measuring screenshots. Calipers brings the same precision to your browser — with direct DOM access and no screenshot step."
    >
      <SectionLabel label="Why developers switch" />
      <BodyText>
        PixelSnap is excellent for measuring static screenshots, but web developers often need to check spacing on
        live pages — after CSS changes, responsive breakpoints, or dynamic content. Calipers measures elements
        directly in the DOM, so you always get the real rendered size, not an approximation from a captured image.
      </BodyText>

      <SectionLabel label="Comparison" />
      <ComparisonTable rows={ROWS} />

      <SectionLabel label="When Calipers is the better fit" />
      <BodyText>
        Choose Calipers when you want to measure spacing on a live webpage without leaving the browser, verify
        responsive layouts at different viewport sizes, inspect box model values alongside distances, or use a
        free open-source tool your whole team can install in seconds.
      </BodyText>

      <SectionLabel label="Related" />
      <BodyText>
        See also{' '}
        <InlineLink href="/alternatives/page-ruler">Calipers vs Page Ruler Redux</InlineLink> or read the{' '}
        <InlineLink href="/use-cases/design-handoff">design handoff use case</InlineLink>.
      </BodyText>

      <InstallCta />
    </ContentPage>
  );
}
