import { ImageResponse } from 'next/og';
import { fetchPerfumeBySlug } from '@/lib/queries/perfumes';

export const runtime = 'edge';
export const alt = 'Cloud PerfumeBD';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = { params: Promise<{ slug: string }> };

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const perfume = await fetchPerfumeBySlug(slug);

  const brand = perfume?.brand ?? 'Cloud PerfumeBD';
  const name = perfume?.name ?? 'Fragrance Directory';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '80px',
          background: '#1a1a1a',
          color: '#fff',
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 4, textTransform: 'uppercase', color: '#d4af37', marginBottom: 24 }}>
          {brand}
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.15, maxWidth: 950 }}>
          {name}
        </div>
        <div style={{ fontSize: 28, color: '#999', marginTop: 40 }}>
          Decants & bottles in Bangladesh · Cloud PerfumeBD
        </div>
      </div>
    ),
    { ...size }
  );
}
