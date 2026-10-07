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
  title: 'Raval vs Page Ruler Redux',
  description:
    'Compare Raval and Page Ruler Redux for measuring elements in Chrome. Raval adds multi-element measure, alignment guides, box values, and design tokens.',
  path: '/alternatives/page-ruler',
});

const ROWS = [
  { feature: 'Hover dimensions', raval: 'Yes — Inspect mode', alternative: 'Yes' },
  { feature: 'Measure distance between elements', raval: 'Yes — up to 5 elements at once', alternative: 'Basic ruler only' },
  { feature: 'Alignment guides', raval: 'Yes — draggable, persisted', alternative: 'No' },
  { feature: 'Margin, padding, border and radius values', raval: 'Yes — in Inspect details', alternative: 'No' },
  { feature: 'Typography and colours', raval: 'Yes', alternative: 'No' },
  { feature: 'Annotations', raval: 'Yes — callouts, notes, arrows, pen', alternative: 'No' },
  { feature: 'Snap to element edges', raval: 'Yes', alternative: 'No' },
  { feature: 'Design token extraction', raval: 'Yes', alternative: 'No' },
  { feature: 'Screenshot export', raval: 'Yes — with measurements', alternative: 'No' },
  { feature: 'Keyboard shortcuts', raval: 'Full keyboard-first workflow', alternative: 'Limited' },
  { feature: 'Open source', raval: 'Yes (MIT)', alternative: 'No' },
];

export default function PageRulerAlternativePage() {
  return (
    <ContentPage
      title="Raval vs Page Ruler Redux"
      subtitle="Page Ruler Redux is a lightweight pixel ruler for Chrome. Raval extends that idea with multi-element measurement, guides, box model inspection, and more."
    >
      <SectionLabel label="The short version" />
      <BodyText>
        If you only need a simple ruler overlay, Page Ruler Redux works well. If you regularly check spacing
        between UI elements, verify alignment against a design spec, or inspect box model values during QA,
        Raval is built for that workflow.
      </BodyText>

      <SectionLabel label="Comparison" />
      <ComparisonTable rows={ROWS} />

      <SectionLabel label="What Raval adds" />
      <BodyText>
        Click two elements in Measure mode and Raval shows the pixel gap between their closest edges — with
        alignment guidelines drawn automatically. Switch to Guides mode to pin horizontal and vertical lines
        you can drag onto element edges. Click any element in Inspect mode to see its margin, padding, and
        border values without opening DevTools.
      </BodyText>

      <SectionLabel label="Related" />
      <BodyText>
        See also{' '}
        <InlineLink href="/alternatives/pixelsnap">Raval vs PixelSnap</InlineLink> or the{' '}
        <InlineLink href="/use-cases/frontend-qa">frontend QA guide</InlineLink>.
      </BodyText>

      <InstallCta />
    </ContentPage>
  );
}
