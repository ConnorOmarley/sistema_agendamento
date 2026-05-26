import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Acompanha · Pedagogia & Psicopedagogia';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #6d28d9 0%, #9333ea 45%, #db2777 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '60px',
        }}
      >
        {/* Logo badge */}
        <div
          style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '28px',
            width: '96px',
            height: '96px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '32px',
            border: '2px solid rgba(255,255,255,0.3)',
          }}
        >
          <span style={{ fontSize: '52px', color: 'white' }}>✦</span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '80px',
            fontWeight: 900,
            color: 'white',
            letterSpacing: '-2px',
            lineHeight: 1,
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          Acompanha
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '32px',
            color: 'rgba(255,255,255,0.85)',
            fontWeight: 600,
            marginBottom: '40px',
            textAlign: 'center',
          }}
        >
          Pedagogia &amp; Psicopedagogia
        </div>

        {/* Pills */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {['Agenda', 'Prontuários', 'Cobranças'].map((label) => (
            <div
              key={label}
              style={{
                background: 'rgba(255,255,255,0.18)',
                border: '1.5px solid rgba(255,255,255,0.35)',
                borderRadius: '100px',
                padding: '10px 28px',
                fontSize: '24px',
                color: 'white',
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            fontSize: '20px',
            color: 'rgba(255,255,255,0.55)',
            fontWeight: 500,
          }}
        >
          acompanha-kappa.vercel.app
        </div>
      </div>
    ),
    { ...size, fonts: [] },
  );
}
