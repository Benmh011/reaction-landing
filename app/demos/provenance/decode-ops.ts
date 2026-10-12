// Copied unchanged from the South Moor PMS (lib/decode-ops.ts, 12 Oct 2026).
// Shared scanner code: keep it identical to South Moor's so a fix in one
// can be carried to the other.

/* ---------------------------------------------------------------------------
 * decode-ops.ts — what is done to a picture before the decoder sees it.
 *
 * The decoder (ZXing) reads a grey image and either finds a code or does
 * not. Whether it finds one depends far more on what it is handed than on
 * anything it does: a DataMatrix a few hundred pixels across in a 4k frame
 * is under the size its detector needs, a barcode held sideways is invisible
 * to a line scanner, and a code inkjetted as white dots on black lacquer has
 * neither the solid finder pattern nor the reflectance the detector expects.
 * Each of those was found on a real pack and each has a fix that is plain
 * arithmetic on the pixels. The fixes live here, on grey arrays, with no
 * canvas and no DOM, so they are tested by number rather than by eye and the
 * same code runs on a still photo and on a frame of live video.
 *
 * A pass is one recipe: crop, scale, turn, and — for the dotted codes — a
 * threshold, a dilation and an inversion. The decoder runs the passes in a
 * fixed order and the first that reads wins.
 * ------------------------------------------------------------------------- */

export type Grey = { data: Uint8ClampedArray; w: number; h: number };

/** RGBA pixels → grey, the weighting the decoder uses. */
export function greyFromRgba(rgba: Uint8ClampedArray, w: number, h: number): Grey {
  const data = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) data[j] = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000;
  return { data, w, h };
}

/** The middle `fraction` of the picture, each way. */
export function cropCentre(g: Grey, fraction: number): Grey {
  if (fraction >= 1) return g;
  const w = Math.max(1, Math.round(g.w * fraction)), h = Math.max(1, Math.round(g.h * fraction));
  const x0 = Math.floor((g.w - w) / 2), y0 = Math.floor((g.h - h) / 2);
  const data = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) data.set(g.data.subarray((y0 + y) * g.w + x0, (y0 + y) * g.w + x0 + w), y * w);
  return { data, w, h };
}

/** Enlarge by a whole number, each source pixel becoming a block. Nearest
 *  neighbour on purpose: a module's edge stays an edge, which is what the
 *  detector is looking for; smoothing would soften it. */
export function upscale(g: Grey, factor: number): Grey {
  const f = Math.max(1, Math.round(factor));
  if (f === 1) return g;
  const w = g.w * f, h = g.h * f;
  const data = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    const sy = (y / f) | 0;
    for (let x = 0; x < w; x++) data[y * w + x] = g.data[sy * g.w + ((x / f) | 0)];
  }
  return { data, w, h };
}

/** Shrink so the long side is at most `max` pixels, averaging the pixels
 *  each output pixel covers so thin bars do not alias away. */
export function fitWithin(g: Grey, max: number): Grey {
  const long = Math.max(g.w, g.h);
  if (long <= max) return g;
  const scale = max / long;
  const w = Math.max(1, Math.round(g.w * scale)), h = Math.max(1, Math.round(g.h * scale));
  const data = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    const sy0 = Math.floor(y / scale), sy1 = Math.min(g.h, Math.max(sy0 + 1, Math.floor((y + 1) / scale)));
    for (let x = 0; x < w; x++) {
      const sx0 = Math.floor(x / scale), sx1 = Math.min(g.w, Math.max(sx0 + 1, Math.floor((x + 1) / scale)));
      let sum = 0, n = 0;
      for (let yy = sy0; yy < sy1; yy++) for (let xx = sx0; xx < sx1; xx++) { sum += g.data[yy * g.w + xx]; n++; }
      data[y * w + x] = sum / n;
    }
  }
  return { data, w, h };
}

/** A quarter turn clockwise. The library's own turn keeps the old width and
 *  height on the turned pixels, so the turn is done here. */
export function rotate90(g: Grey): Grey {
  const w = g.h, h = g.w;
  const data = new Uint8ClampedArray(w * h);
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) data[x * w + (w - 1 - y)] = g.data[y * g.w + x];
  return { data, w, h };
}

/** Otsu's threshold: the grey level that best splits the picture into two
 *  classes. Computed per picture, because a pack is anything from white card
 *  to black lacquer and one fixed level suits neither. */
export function otsu(g: Grey): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < g.data.length; i++) hist[g.data[i]]++;
  const total = g.data.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0, wB = 0, best = 0, threshold = 0;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; threshold = t; }
  }
  return threshold;
}

/** Black and white: every pixel above `t` becomes 255, the rest 0. */
export function threshold(g: Grey, t: number): Grey {
  const data = new Uint8ClampedArray(g.data.length);
  for (let i = 0; i < g.data.length; i++) data[i] = g.data[i] > t ? 255 : 0;
  return { data, w: g.w, h: g.h };
}

/** Grow the bright pixels by `radius`: a square window, so isolated printed
 *  dots a module apart merge into the solid blocks a DataMatrix is meant to
 *  be made of. */
export function dilateBright(g: Grey, radius: number): Grey {
  const r = Math.max(0, radius | 0);
  if (r === 0) return g;
  const { w, h } = g;
  // Two passes, rows then columns: a square window in linear time.
  const rows = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    const off = y * w;
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) if (g.data[off + k] > v) { v = g.data[off + k]; if (v === 255) break; }
      rows[off + x] = v;
    }
  }
  const data = new Uint8ClampedArray(w * h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let v = 0;
      for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) if (rows[k * w + x] > v) { v = rows[k * w + x]; if (v === 255) break; }
      data[y * w + x] = v;
    }
  }
  return { data, w, h };
}

/** Dark for light. A code printed light-on-dark reads once it is turned
 *  round; the decoder expects dark modules on a light ground. */
export function invert(g: Grey): Grey {
  const data = new Uint8ClampedArray(g.data.length);
  for (let i = 0; i < g.data.length; i++) data[i] = 255 - g.data[i];
  return { data, w: g.w, h: g.h };
}

// --- the passes -----------------------------------------------------------------------

export type Pass = {
  name: string;
  /** Centre crop, as a fraction of each side. */
  crop?: number;
  /** Enlarge by this whole number after cropping. */
  up?: number;
  /** Shrink so the long side is at most this. */
  max?: number;
  rotate?: boolean;
  /** The dotted-code recipe: Otsu, grow the bright dots by this radius,
   *  then invert (`dark: false`, dots light on dark) or grow the dark dots
   *  instead (`dark: true`, dots dark on light). */
  dots?: { radius: number; dark: boolean };
};

/** One pass applied to a grey picture, in the order that matters: crop
 *  first (less to do), then the size, then the turn, then the dot recipe. */
export function applyPass(g: Grey, p: Pass): Grey {
  let out = g;
  if (p.crop && p.crop < 1) out = cropCentre(out, p.crop);
  if (p.max) out = fitWithin(out, p.max);
  if (p.up && p.up > 1) out = upscale(out, p.up);
  if (p.rotate) out = rotate90(out);
  if (p.dots) {
    const t = otsu(out);
    const bw = threshold(out, t);
    if (p.dots.dark) out = invert(dilateBright(invert(bw), p.dots.radius));
    else out = invert(dilateBright(bw, p.dots.radius));
  }
  return out;
}

/** A still photo: 3–4k pixels across, no hurry. The whole picture at the
 *  size the decoder likes, the middle blown up, both turned; then the
 *  dotted-code recipes at two radii and once magnified; then the sizes
 *  either side in case the first was wrong. */
export const PHOTO_PASSES: Pass[] = [
  { name: "whole", max: 1200 },
  { name: "whole turned", max: 1200, rotate: true },
  { name: "middle ×2", crop: 0.3, max: 800, up: 2 },
  { name: "middle ×2 turned", crop: 0.3, max: 800, up: 2, rotate: true },
  { name: "middle 0.6", crop: 0.6, max: 1600 },
  { name: "dots r1", crop: 0.42, max: 900, dots: { radius: 1, dark: false } },
  { name: "dots r2", crop: 0.42, max: 900, dots: { radius: 2, dark: false } },
  { name: "dots r1 ×2", crop: 0.42, max: 600, up: 2, dots: { radius: 1, dark: false } },
  { name: "dark dots r1", crop: 0.42, max: 900, dots: { radius: 1, dark: true } },
  { name: "whole small", max: 800 },
  { name: "whole large", max: 2000 },
  { name: "middle 0.6 turned", crop: 0.6, max: 1600, rotate: true },
];

/** Live video: one pass per frame, a few frames a second, so the passes are
 *  spread over frames rather than run together. Three frames in every three
 *  cover the whole frame, the magnified middle, and one dotted-code recipe;
 *  the turn and the radius alternate between rounds. The dotted recipe is
 *  the dearest, and gets every third frame and no more. */
export const VIDEO_CYCLE: Pass[] = [
  { name: "whole", max: 1280 },
  { name: "middle ×2", crop: 0.3, max: 640, up: 2 },
  { name: "dots r1", crop: 0.42, max: 720, dots: { radius: 1, dark: false } },
  { name: "whole turned", max: 1280, rotate: true },
  { name: "middle ×2 turned", crop: 0.3, max: 640, up: 2, rotate: true },
  { name: "dots r2", crop: 0.42, max: 720, dots: { radius: 2, dark: false } },
  { name: "whole", max: 1280 },
  { name: "middle ×2", crop: 0.3, max: 640, up: 2 },
  { name: "dots r1 ×2", crop: 0.42, max: 480, up: 2, dots: { radius: 1, dark: false } },
];

export function videoPass(frame: number): Pass {
  return VIDEO_CYCLE[((frame % VIDEO_CYCLE.length) + VIDEO_CYCLE.length) % VIDEO_CYCLE.length];
}
