import { ImageResponse } from 'next/og';
import { fetchPerfumeBySlug } from '@/lib/queries/perfumes';
import { fetchPerfumeSnapshot } from '@/lib/perfumeSnapshot';

export const runtime = 'edge';
export const alt = 'Cloud PerfumeBD';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const GOLD = '#d4af37';

type Props = { params: Promise<{ slug: string }> };

type Stat = { label: string; value: string };

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const perfume = await fetchPerfumeBySlug(slug);
  const snap = perfume ? await fetchPerfumeSnapshot(perfume) : null;

  const brand = perfume?.brand ?? 'Cloud PerfumeBD';
  const name = perfume?.name ?? 'Fragrance Directory';
  // The card renderer draws WebP as a blank box, so only PNG/JPEG photos are used.
  const photo = perfume?.images?.find((u) => !/\.webp(\?|$)/i.test(u)) ?? null;
  const accords = (perfume?.accords ?? []).slice(0, 4);

  const stats: Stat[] = [];
  if (snap?.ratingAvg != null && snap.reviewCount > 0) {
    stats.push({ label: `${snap.reviewCount} review${snap.reviewCount > 1 ? 's' : ''}`, value: `${snap.ratingAvg.toFixed(1)} / 5` });
  }
  if (snap?.lowPrice != null) {
    stats.push({ label: 'From', value: `Tk ${Math.round(snap.lowPrice).toLocaleString('en-US')}` });
  }
  if (snap?.longevity) stats.push({ label: 'Lasts', value: snap.longevity.label });
  if (snap?.projection) stats.push({ label: 'Projection', value: snap.projection.label });
  if (snap?.gender) stats.push({ label: 'Leans', value: snap.gender.label });
  const shown = stats.slice(0, 4);

  const nameSize = name.length > 34 ? 46 : name.length > 22 ? 56 : 68;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: 'linear-gradient(135deg, #0e0e0e 0%, #1c1a14 60%, #2a2412 100%)',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, padding: '56px 24px 48px 64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 22, letterSpacing: 5, textTransform: 'uppercase', color: GOLD }}>
            Cloud PerfumeBD
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 26, letterSpacing: 4, textTransform: 'uppercase', color: GOLD, marginBottom: 14 }}>
              {brand}
            </div>
            <div style={{ display: 'flex', fontSize: nameSize, fontWeight: 700, lineHeight: 1.1, maxWidth: photo ? 640 : 1000 }}>
              {name}
            </div>
            {accords.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 22 }}>
                {accords.map((a) => (
                  <div
                    key={a}
                    style={{
                      display: 'flex',
                      fontSize: 22,
                      textTransform: 'capitalize',
                      color: '#e9dba5',
                      border: '1px solid rgba(212,175,55,0.45)',
                      borderRadius: 999,
                      padding: '6px 18px',
                      marginRight: 10,
                      marginBottom: 8,
                    }}
                  >
                    {a}
                  </div>
                ))}
              </div>
            )}
          </div>

          {shown.length > 0 ? (
            <div style={{ display: 'flex' }}>
              {shown.map((s, i) => (
                <div
                  key={s.label}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    paddingRight: 28,
                    marginRight: 28,
                    borderRight: i < shown.length - 1 ? '1px solid rgba(255,255,255,0.18)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', fontSize: 34, fontWeight: 700 }}>{s.value}</div>
                  <div style={{ display: 'flex', fontSize: 18, letterSpacing: 2, textTransform: 'uppercase', color: '#9a9a9a', marginTop: 4 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', fontSize: 26, color: '#9a9a9a' }}>
              Decants & bottles in Bangladesh
            </div>
          )}
        </div>

        {photo && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 420, padding: '48px 56px 48px 0' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 364,
                height: 534,
                borderRadius: 28,
                background: 'linear-gradient(160deg, #ffffff 0%, #f3ecd3 100%)',
                border: `2px solid ${GOLD}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="" width={320} height={490} style={{ objectFit: 'contain' }} />
            </div>
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
