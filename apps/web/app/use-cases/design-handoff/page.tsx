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
  title: 'Design Handoff with Calipers',
  description:
    'Verify that implemented UI matches your design spec. Use Calipers to check spacing, alignment, typography, and box model values on any live webpage.',
  path: '/use-cases/design-handoff',
});

export default function DesignHandoffPage() {
  return (
    <ContentPage
      title="Design Handoff with Calipers"
      subtitle="Stop guessing whether the build matches the spec. Calipers gives designers and developers a shared way to verify spacing and alignment on the real page."
    >
      <SectionLabel label="After handoff" />
      <BodyText>
        The design file says 16px padding and 24px gap between cards. The implementation looks close, but
        is it right? Instead of inspecting each element in DevTools or taking screenshots into a desktop ruler
        app, open Calipers directly on the staging URL.
      </BodyText>

      <SectionLabel label="What to check" />
      <BodyText>
        Use Inspect mode (1) to hover over any element and see its exact width × height. Enable the box model
        overlay (B) to confirm margin, padding, and border values. In Measure mode (2), click two components
        to see the pixel distance between them — copy the value with one click.
      </BodyText>
      <BodyText>
        Place alignment guides (3) along key vertical rhythm lines to check that headings, icons, and columns
        share the same horizontal alignment. Use the colour picker (4) to verify fills and text colours match
        the palette.
      </BodyText>

      <SectionLabel label="Share findings" />
      <BodyText>
        Export a screenshot (S) with measurements overlaid and attach it to your review comment. Extract design
        tokens (D) to compare CSS custom properties against your token file. Everything runs in the browser —
        no account, no uploads, no leaving the page.
      </BodyText>

      <SectionLabel label="Related" />
      <BodyText>
        Developers doing pre-ship checks should read the{' '}
        <InlineLink href="/use-cases/frontend-qa">frontend QA guide</InlineLink>. Coming from a desktop tool?{' '}
        <InlineLink href="/alternatives/pixelsnap">Compare Calipers with PixelSnap</InlineLink>.
      </BodyText>

      <InstallCta label="Install Calipers →" />
    </ContentPage>
  );
}
