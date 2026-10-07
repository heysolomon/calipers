import { OG_SIZE, renderOg } from '../lib/og';

// Used as the link preview for the homepage and every page that does not set its own.
export const alt = 'Raval: measure, inspect and annotate any webpage';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return renderOg();
}
