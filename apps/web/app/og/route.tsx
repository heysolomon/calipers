import type { NextRequest } from 'next/server';
import { renderOg } from '../../lib/og';

/** The same preview image with a page's own title: `/og?title=Keyboard%20shortcuts`. */
export function GET(req: NextRequest) {
  const title = new URL(req.url).searchParams.get('title')?.slice(0, 90);
  return renderOg(title || undefined);
}
