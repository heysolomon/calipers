import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { DemoProvider } from '../components/demo-provider';
import { DemoToolbar } from '../components/demo-toolbar';
import { DemoOverlay } from '../components/demo-overlay';
import { DemoNotice } from '../components/demo-notice';
import { DemoPageWrapper } from '../components/demo-page-wrapper';
import { CustomCursor } from '../components/custom-cursor';
import { AgentationWidget } from '../components/agentation-widget';
import { JsonLd } from '../components/json-ld';
import { SkipLink } from '../components/skip-link';
import { SEO_KEYWORDS, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from '../lib/site';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  authors: [{ name: 'Calipers Contributors' }],
  creator: 'Calipers',
  applicationName: SITE_NAME,
  category: 'design tools',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  other: {
    'theme-color': '#F7F7F7',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <JsonLd />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="LLM-friendly site summary" />
      </head>
      <body>
        <SkipLink />
        <DemoProvider>
          <CustomCursor />
          <DemoToolbar />
          <DemoOverlay />
          <DemoNotice />
          <DemoPageWrapper>
            <div id="main-content">{children}</div>
          </DemoPageWrapper>
        </DemoProvider>
        <Analytics />
        <SpeedInsights />
        {process.env.NODE_ENV === 'development' && <AgentationWidget />}
      </body>
    </html>
  );
}
