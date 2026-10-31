import { ImageResponse } from 'next/og';
import { fetchSellerPass, tierLabel, cardName, initialOf, isCardSafeImage } from '@/lib/sellerPass';

export const runtime = 'edge';
export const alt = 'Cloud PerfumeBD Seller Pass';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const GOLD = '#d4af37';
const BG = 'radial-gradient(circle at 20% 15%, #2a2412 0%, #15130d 55%, #0b0b0b 100%)';

type Props = { params: Promise<{ username: string }> };

type Stat = { value: string; label: string };

export default async function Image({ params }: Props) {
  const { username } = await params;
  const pass = await fetchSellerPass(username);

  if (!pass) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: BG, color: '#fff' }}>
          <div style={{ display: 'flex', fontSize: 28, letterSpacing: 6, textTransform: 'uppercase', color: GOLD }}>Cloud PerfumeBD</div>
          <div style={{ display: 'flex', fontSize: 56, fontWeight: 700, marginTop: 20 }}>Perfume community for Bangladesh</div>
        </div>
      ),
      { ...size }
    );
  }

  const name = cardName(pass.displayName, pass.username);
  const photo = isCardSafeImage(pass.avatarUrl) ? pass.avatarUrl : null;
  const hasRating = pass.ratingAvg != null && pass.ratingCount > 0;

  const stats: Stat[] = [];
  if (hasRating) stats.push({ value: `${pass.ratingAvg!.toFixed(1)}★`, label: `${pass.ratingCount} review${pass.ratingCount > 1 ? 's' : ''}` });
  stats.push({ value: String(pass.listingCount), label: 'Listings' });
  stats.push({ value: String(pass.memberSince), label: 'Member since' });

  const badges: string[] = [];
  if (pass.foundingNumber != null) badges.push(`FOUNDING #${String(pass.foundingNumber).padStart(3, '0')}`);
  if (pass.verified) badges.push('VERIFIED');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          padding: 28,
          background: BG,
          color: '#fff',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: 1,
            border: '1px solid rgba(212,175,55,0.55)',
            borderRadius: 28,
            padding: '40px 52px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 22, letterSpacing: 4, textTransform: 'uppercase', color: GOLD }}>
            Cloud PerfumeBD · Seller Pass
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 180,
                height: 180,
                borderRadius: 999,
                border: `4px solid ${GOLD}`,
                background: '#2a2412',
                overflow: 'hidden',
                marginRight: 44,
              }}
            >
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" width={180} height={180} style={{ objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', fontSize: 84, fontWeight: 700, color: GOLD }}>{initialOf(name)}</div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: name.length > 18 ? 52 : 68, fontWeight: 700, lineHeight: 1.1 }}>{name}</div>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 16, fontSize: 28, color: GOLD }}>
                <div style={{ display: 'flex' }}>{tierLabel(pass.tier, pass.isEarly)}</div>
                {badges.map((b) => (
                  <div key={b} style={{ display: 'flex', marginLeft: 20, fontSize: 20, letterSpacing: 2, color: '#e9dba5', border: '1px solid rgba(212,175,55,0.5)', borderRadius: 999, padding: '4px 16px' }}>
                    {b}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex' }}>
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    paddingRight: 32,
                    marginRight: 32,
                    borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.18)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', fontSize: 40, fontWeight: 700 }}>{s.value}</div>
                  <div style={{ display: 'flex', fontSize: 18, letterSpacing: 2, textTransform: 'uppercase', color: '#9a9a9a', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', fontSize: 24, color: '#e9dba5' }}>cloudperfumebd.com/perfumes/{pass.username}</div>
              <div style={{ display: 'flex', fontSize: 20, color: '#9a9a9a', marginTop: 6 }}>Get yours free at cloudperfumebd.com</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
