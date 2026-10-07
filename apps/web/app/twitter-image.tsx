import { OG_SIZE, renderOg } from '../lib/og';

export const alt = 'Raval: measure, inspect and annotate any webpage';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return renderOg();
}
