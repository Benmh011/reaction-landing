import { ImageResponse } from 'next/og';

/**
 * Open Graph image generated at the edge.
 *
 * Lives at /opengraph-image and is auto-attached to <meta property="og:image">
 * by Next.js. Also reused as the Twitter card image (see metadata in layout.tsx).
 *
 * Brand:
 *  - Background: #081b3d (deep lab-navy)
 *  - Scientific blue accent: #7ea9f2 on dark
 *  - Marble text: #eef3fa
 *  - Display: Newsreader italic
 *  - Body: Inter
 */

export const runtime = 'edge';
export const alt = 'Reaction — locally hosted multi-agentic systems for business';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Fetch a Google Fonts WOFF2 by parsing the CSS API response.
 * A desktop User-Agent forces Google to return WOFF2 (not variable fonts,
 * which `next/og` cannot render).
 */
async function loadGoogleFont(
  family: string,
  weight: number,
  style: 'normal' | 'italic' = 'normal',
): Promise<ArrayBuffer> {
  const familyParam = family.replace(/ /g, '+');
  const axes = style === 'italic' ? `ital,wght@1,${weight}` : `wght@${weight}`;
  const cssUrl = `https://fonts.googleapis.com/css2?family=${familyParam}:${axes}&display=swap`;

  const css = await fetch(cssUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  }).then((r) => r.text());

  const fontUrl = css.match(/src:\s*url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
  if (!fontUrl) {
    throw new Error(`Could not extract font URL for ${family} ${weight} ${style}`);
  }

  return fetch(fontUrl).then((r) => r.arrayBuffer());
}

export default async function Image() {
  // Fetch both fonts in parallel. If either fails the OG image still renders
  // with system fonts — but in practice Google Fonts is rock-solid.
  const [newsreaderItalic, interRegular, interSemibold] = await Promise.all([
    loadGoogleFont('Newsreader', 500, 'italic'),
    loadGoogleFont('Inter', 400),
    loadGoogleFont('Inter', 600),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#081b3d',
          color: '#eef3fa',
          fontFamily: 'Inter',
          position: 'relative',
        }}
      >
        {/* Subtle slate-blue arc in the bottom-right corner for depth */}
        <div
          style={{
            position: 'absolute',
            right: '-120px',
            bottom: '-120px',
            width: '420px',
            height: '420px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle at center, rgba(13, 93, 215, 0.4) 0%, rgba(13, 93, 215, 0) 70%)',
          }}
        />

        {/* Wordmark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            fontFamily: 'Inter',
            fontWeight: 600,
            fontSize: 28,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#7ea9f2',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: '#7ea9f2',
            }}
          />
          Reaction
        </div>

        {/* Headline + subtitle */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '28px',
            maxWidth: '960px',
          }}
        >
          <div
            style={{
              fontFamily: 'Newsreader',
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 76,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: '#eef3fa',
            }}
          >
            Every action has an equal and opposite Reaction.
          </div>
          <div
            style={{
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 30,
              lineHeight: 1.35,
              color: '#a9bdde',
              maxWidth: '820px',
            }}
          >
            Locally hosted multi-agentic systems — augmented intelligence for business.
          </div>
        </div>

        {/* Footer URL */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: 'Inter',
            fontWeight: 400,
            fontSize: 22,
            color: '#5f7395',
          }}
        >
          <span>reaction.org.uk</span>
          <span style={{ letterSpacing: '0.08em' }}>LMAS · augmented over artificial</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Newsreader',
          data: newsreaderItalic,
          style: 'italic',
          weight: 500,
        },
        {
          name: 'Inter',
          data: interRegular,
          style: 'normal',
          weight: 400,
        },
        {
          name: 'Inter',
          data: interSemibold,
          style: 'normal',
          weight: 600,
        },
      ],
    },
  );
}
