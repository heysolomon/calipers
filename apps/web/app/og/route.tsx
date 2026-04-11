import { ImageResponse } from '@vercel/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') ?? 'Precision measurement for the web';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f0f14',
          fontFamily: 'Inter, sans-serif',
          position: 'relative',
        }}
      >
        {/* Dot grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle, rgba(74,158,255,0.12) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Radial glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(74,158,255,0.18) 0%, transparent 70%)',
          }}
        />

        <div style={{ position: 'relative', textAlign: 'center', padding: '0 80px' }}>
          {/* Logo dot */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#4A9EFF',
                boxShadow: '0 0 12px rgba(74,158,255,0.6)',
              }}
            />
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '18px', fontWeight: 500 }}>
              Calipers
            </span>
          </div>

          <h1
            style={{
              fontSize: '60px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.92)',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              margin: '0 0 16px',
            }}
          >
            {title}
          </h1>

          <p
            style={{
              fontSize: '22px',
              color: 'rgba(255,255,255,0.45)',
              margin: 0,
            }}
          >
            Free, open-source Chrome extension
          </p>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
