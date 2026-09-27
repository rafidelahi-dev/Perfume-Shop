import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const alt = 'Cloud PerfumeBD Journal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = { params: Promise<{ slug: string }> };

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, excerpt')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  const title = post?.title ?? 'Cloud PerfumeBD Journal';

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
          background: '#fdfbf7',
          color: '#1a1a1a',
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 4, textTransform: 'uppercase', color: '#d4af37', marginBottom: 24 }}>
          The Journal
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.2, maxWidth: 980 }}>
          {title}
        </div>
        <div style={{ fontSize: 28, color: '#777', marginTop: 40 }}>
          Cloud PerfumeBD
        </div>
      </div>
    ),
    { ...size }
  );
}
