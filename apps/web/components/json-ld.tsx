import { CHROME_STORE_URL, FORMER_NAME, GITHUB_URL, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL, SITE_VERSION } from '../lib/site';

export function JsonLd() {
  const software = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    alternateName: FORMER_NAME,
    applicationCategory: 'BrowserApplication',
    applicationSubCategory: 'Browser extension',
    operatingSystem: 'Chrome',
    browserRequirements: 'Requires Google Chrome or another Chromium browser',
    license: 'https://opensource.org/license/mit',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    downloadUrl: CHROME_STORE_URL,
    softwareVersion: SITE_VERSION,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Organization',
      name: 'Raval Contributors',
      url: GITHUB_URL,
    },
    featureList: [
      'Inspect the size, typography, colours and box values of any element',
      'Measure the pixel distance between up to five elements',
      'Alignment guides that snap to element edges and are saved per page',
      'Annotate a page with size callouts, notes, arrows and freehand strokes',
      'Extract CSS custom properties as design tokens',
      'Screenshot the page or a region with your marks on it',
    ],
  };

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    alternateName: FORMER_NAME,
    publisher: {
      '@type': 'Organization',
      name: 'Raval Contributors',
    },
  };

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    slogan: SITE_TAGLINE,
    sameAs: [GITHUB_URL, CHROME_STORE_URL],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(software) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
    </>
  );
}
