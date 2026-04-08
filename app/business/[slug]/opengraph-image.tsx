import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export const alt = 'Business Details';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { id } = params;

  const { data: business } = await supabase
    .from('businesses')
    .select('name, category, address, logo_url')
    .eq('id', id)
    .single();

  if (!business) {
    return new ImageResponse(
      (
        <div
          style={{
            background: '#0F172A',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 60,
          }}
        >
          SL Business Index
        </div>
      ),
      { ...size }
    );
  }

  const city = business.address.split(',').pop().trim() || 'Sri Lanka';

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0F172A',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 80,
          color: 'white',
        }}
      >
        {/* Branding Background Pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.1,
            backgroundImage: 'radial-gradient(circle at 2px 2px, #FFD700 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 40,
          }}
        >
          {business.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logo_url}
              alt={business.name}
              style={{
                width: 120,
                height: 120,
                borderRadius: 20,
                marginRight: 30,
                objectFit: 'cover',
                border: '4px solid rgba(255, 215, 0, 0.3)',
              }}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 24,
                color: '#FFD700',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                marginBottom: 10,
              }}
            >
              {business.category}
            </div>
            <div
              style={{
                fontSize: 64,
                fontWeight: 'bold',
                lineHeight: 1.1,
              }}
            >
              {business.name}
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 32,
            color: 'rgba(255, 255, 255, 0.7)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {city} • SL Business Index
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 60,
            display: 'flex',
            alignItems: 'center',
            color: '#FFD700',
            fontSize: 20,
            letterSpacing: '0.1em',
          }}
        >
          SLBUSINESSINDEX.COM
        </div>
      </div>
    ),
    { ...size }
  );
}
