import { CHROME_STORE_URL, GITHUB_URL, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from '../lib/site';

export function JsonLd() {
  const software = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Chrome, Firefox',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    downloadUrl: CHROME_STORE_URL,
    softwareVersion: '0.1.0',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Organization',
      name: 'Calipers Contributors',
      url: GITHUB_URL,
    },
    featureList: [
      'Measure pixel distance between elements',
      'Inspect element dimensions on hover',
      'Draggable alignment guides with snap-to-edge',
      'Box model overlay',
      'Design token extraction',
      'Screenshot export with measurements',
    ],
  };

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    publisher: {
      '@type': 'Organization',
      name: 'Calipers Contributors',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/docs?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
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
