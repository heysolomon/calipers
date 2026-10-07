import { OG_SIZE, renderOg } from '../lib/og';

// Drawing revision: 7
// Next builds this image's URL from a hash of THIS file, not of lib/og.tsx. Without a
// change here the URL stays the same after a redesign, and X, Slack, the CDN and
// browsers (which are told to keep it for a year) go on showing the old picture.
// Bump the number whenever the drawing changes.

export const alt = 'Raval: measure, inspect and annotate any webpage';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return renderOg();
}
