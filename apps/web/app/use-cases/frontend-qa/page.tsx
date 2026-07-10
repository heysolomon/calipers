import type { Metadata } from 'next';
import {
  BodyText,
  buildPageMetadata,
  ContentPage,
  InlineLink,
  InstallCta,
  SectionLabel,
} from '../../../components/content-page';

export const metadata: Metadata = buildPageMetadata({
  title: 'Frontend QA with Calipers',
  description:
    'Use Calipers to measure spacing between UI elements, verify alignment, and catch layout bugs before shipping. A practical frontend QA workflow inside Chrome.',
  path: '/use-cases/frontend-qa',
});

export default function FrontendQaPage() {
  return (
    <ContentPage
      title="Frontend QA with Calipers"
      subtitle="Catch spacing and alignment bugs before they reach production. Calipers lets you measure any element on a live page in seconds."
    >
      <SectionLabel label="The problem" />
      <BodyText>
        Layout bugs are hard to spot by eye. A button might be 22px from its neighbour when the spec says 24px.
        A card grid might drift at certain breakpoints. DevTools shows computed values, but measuring the gap
        between two arbitrary elements still takes too many steps.
      </BodyText>

      <SectionLabel label="QA workflow" />
      <BodyText>
        Activate Calipers with Cmd+Shift+M (or Ctrl+Shift+M). Switch to Measure mode (2) and click the two
        elements you want to compare — Calipers draws the distance between their closest edges and labels it
        in pixels. Click the label to copy the value to your clipboard.
      </BodyText>
      <BodyText>
        For broader checks, use Spacing Grid mode (5) to see all gaps between sibling elements at once. Toggle
        the box model overlay (B) to verify padding and margin values match the design system.
      </BodyText>

      <SectionLabel label="Before you ship" />
      <BodyText>
        Resize the viewport and re-measure at mobile, tablet, and desktop breakpoints. Pin alignment guides (3)
        to check that columns and headings line up across sections. Export a screenshot (S) with measurements
        baked in to attach to your PR or ticket.
      </BodyText>

      <SectionLabel label="Related" />
      <BodyText>
        Designers verifying specs should read the{' '}
        <InlineLink href="/use-cases/design-handoff">design handoff guide</InlineLink>. Compare Calipers with{' '}
        <InlineLink href="/alternatives/page-ruler">Page Ruler Redux</InlineLink>.
      </BodyText>

      <InstallCta label="Install Calipers for QA →" />
    </ContentPage>
  );
}
