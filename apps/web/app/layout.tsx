import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { DemoProvider } from '../components/demo-provider';
import { DemoToolbar } from '../components/demo-toolbar';
import { DemoOverlay } from '../components/demo-overlay';
import { DemoPageWrapper } from '../components/demo-page-wrapper';
import { CustomCursor } from '../components/custom-cursor';
import { AgentationWidget } from '../components/agentation-widget';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://calipers.solomonakuson.com'),
  title: {
    default: 'Calipers — Precision measurement for the web',
    template: '%s | Calipers',
  },
  description:
    'Free, open-source Chrome extension for measuring distances, inspecting dimensions, and checking alignment on any webpage.',
  keywords: ['design tools', 'chrome extension', 'measurement', 'pixel perfect', 'frontend'],
  authors: [{ name: 'Calipers Contributors' }],
  creator: 'Calipers',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://calipers.solomonakuson.com',
    title: 'Calipers — Precision measurement for the web',
    description:
      'Free, open-source Chrome extension for measuring distances, inspecting dimensions, and checking alignment on any webpage.',
    siteName: 'Calipers',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Calipers — Precision measurement for the web',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Calipers — Precision measurement for the web',
    description:
      'Free, open-source Chrome extension for measuring distances, inspecting dimensions, and checking alignment on any webpage.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>

      <body>
        <DemoProvider>
          <CustomCursor />
          <DemoToolbar />
          <DemoOverlay />
          <DemoPageWrapper>{children}</DemoPageWrapper>
        </DemoProvider>
        <Analytics />
        <SpeedInsights />
        {process.env.NODE_ENV === 'development' && <AgentationWidget />}
      </body>
    </html>
  );
}
