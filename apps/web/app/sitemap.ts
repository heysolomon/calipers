import type { MetadataRoute } from 'next';
import { DOC_NAV } from '../lib/docs';
import { SITE_URL } from '../lib/site';

type Entry = { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number };

const PAGES: Entry[] = [
  { path: '', changeFrequency: 'weekly', priority: 1 },
  { path: '/use-cases/frontend-qa', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/use-cases/design-handoff', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/alternatives/pixelsnap', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/alternatives/page-ruler', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/changelog', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
];

// Every page in the docs sidebar. `/welcome` is left out on purpose: it is for new installs, not search.
const DOCS: Entry[] = DOC_NAV.flatMap((group) => group.items).map(({ href }) => ({
  path: href,
  changeFrequency: href === '/docs' ? 'weekly' : 'monthly',
  priority: href === '/docs' ? 0.9 : 0.8,
}));

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [...PAGES, ...DOCS].map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
