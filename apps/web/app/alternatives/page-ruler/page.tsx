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
  title: 'Calipers vs Page Ruler Redux',
  description:
    'Compare Calipers and Page Ruler Redux for measuring elements in Chrome. Calipers adds multi-element measure, alignment guides, box model overlay, and design tokens.',
  path: '/alternatives/page-ruler',
});

const ROWS = [
  { feature: 'Hover dimensions', calipers: 'Yes — Inspect mode', alternative: 'Yes' },
  { feature: 'Measure distance between elements', calipers: 'Yes — up to 5 elements at once', alternative: 'Basic ruler only' },
  { feature: 'Alignment guides', calipers: 'Yes — draggable, persisted', alternative: 'No' },
  { feature: 'Box model overlay', calipers: 'Yes', alternative: 'No' },
  { feature: 'Snap to element edges', calipers: 'Yes', alternative: 'No' },
  { feature: 'Design token extraction', calipers: 'Yes', alternative: 'No' },
  { feature: 'Screenshot export', calipers: 'Yes — with measurements', alternative: 'No' },
  { feature: 'Keyboard shortcuts', calipers: 'Full keyboard-first workflow', alternative: 'Limited' },
  { feature: 'Open source', calipers: 'Yes (MIT)', alternative: 'No' },
];

export default function PageRulerAlternativePage() {
  return (
    <ContentPage
      title="Calipers vs Page Ruler Redux"
      subtitle="Page Ruler Redux is a lightweight pixel ruler for Chrome. Calipers extends that idea with multi-element measurement, guides, box model inspection, and more."
    >
      <SectionLabel label="The short version" />
      <BodyText>
        If you only need a simple ruler overlay, Page Ruler Redux works well. If you regularly check spacing
        between UI elements, verify alignment against a design spec, or inspect box model values during QA,
        Calipers is built for that workflow.
      </BodyText>

      <SectionLabel label="Comparison" />
      <ComparisonTable rows={ROWS} />

      <SectionLabel label="What Calipers adds" />
      <BodyText>
        Click two elements in Measure mode and Calipers shows the pixel gap between their closest edges — with
        alignment guidelines drawn automatically. Switch to Guides mode to pin horizontal and vertical lines
        that snap to element edges. Toggle the box model overlay to see margin, padding, and border values
        without opening DevTools.
      </BodyText>

      <SectionLabel label="Related" />
      <BodyText>
        See also{' '}
        <InlineLink href="/alternatives/pixelsnap">Calipers vs PixelSnap</InlineLink> or the{' '}
        <InlineLink href="/use-cases/frontend-qa">frontend QA guide</InlineLink>.
      </BodyText>

      <InstallCta />
    </ContentPage>
  );
}
