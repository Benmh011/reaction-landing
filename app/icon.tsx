import { ImageResponse } from "next/og";

/**
 * Dynamic favicon — generated at the edge as a proper PNG.
 *
 * Replaces the previous SVG data-URI favicon, which Chrome rendered
 * inconsistently because the data URI omitted explicit width/height.
 *
 * Next.js auto-detects this file and serves it at /icon and as the
 * <link rel="icon"> in HTML. Takes precedence over `metadata.icons`
 * in layout.tsx (which can be left in place as a no-op fallback).
 */

export const runtime = "edge";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

async function loadGoogleFont(
  family: string,
  weight: number,
  style: "normal" | "italic" = "normal",
): Promise<ArrayBuffer> {
  const familyParam = family.replace(/ /g, "+");
  const axes = style === "italic" ? `ital,wght@1,${weight}` : `wght@${weight}`;
  const cssUrl = `https://fonts.googleapis.com/css2?family=${familyParam}:${axes}&display=swap`;

  const css = await fetch(cssUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  }).then((r) => r.text());

  const fontUrl = css.match(/src:\s*url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
  if (!fontUrl) {
    throw new Error(`Could not extract font URL for ${family} ${weight} ${style}`);
  }

  return fetch(fontUrl).then((r) => r.arrayBuffer());
}

export default async function Icon() {
  const newsreaderItalic = await loadGoogleFont("Newsreader", 700, "italic");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          fontFamily: "Newsreader",
          fontStyle: "italic",
          fontWeight: 700,
          fontSize: 64,
          lineHeight: 1,
          color: "#4d6f99",
          letterSpacing: "-0.04em",
          // Nudge the italic letterform so it sits visually centred in the box
          paddingBottom: "4px",
          paddingRight: "2px",
        }}
      >
        R
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Newsreader",
          data: newsreaderItalic,
          style: "italic",
          weight: 700,
        },
      ],
    },
  );
}
