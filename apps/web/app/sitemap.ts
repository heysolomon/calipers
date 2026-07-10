import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/site';

const ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  { path: '', changeFrequency: 'weekly', priority: 1 },
  { path: '/docs', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/docs/getting-started/installation', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/docs/getting-started/shortcuts', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/docs/features/inspect-mode', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/docs/features/measure-mode', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/docs/features/guides', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/docs/features/color-picker', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/docs/features/spacing-grid', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/docs/features/box-model', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/docs/features/rulers', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/docs/features/design-tokens', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/docs/features/screenshot-export', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/docs/contributing', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/changelog', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/alternatives/pixelsnap', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/alternatives/page-ruler', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/use-cases/frontend-qa', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/use-cases/design-handoff', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/changelog', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
