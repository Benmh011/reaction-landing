// Copied unchanged from the South Moor PMS (lib/decode-image.ts, 12 Oct 2026).
// Shared scanner code: keep it identical to South Moor's so a fix in one
// can be carried to the other.

/* ---------------------------------------------------------------------------
 * decode-image.ts — a barcode out of a picture.
 *
 * A photo from the phone's camera, a picture already in the library, or a
 * frame of live video: drawn onto a canvas once, turned to grey, and then
 * handed to ZXing (@zxing/library, the pure-JS port — the decoder itself is
 * not something to hand-write) through a fixed list of passes, each a
 * recipe from lib/decode-ops.ts: the whole picture at a sensible size, the
 * middle blown up, either turned through ninety degrees, and the recipes for
 * codes inkjetted as dots on dark panels. The first pass that reads wins.
 * What comes back is the code's text, exactly as a hand scanner would have
 * typed it, so it goes into the same box; a GS1 DataMatrix keeps its group
 * separators and lib/gs1.ts reads it as usual.
 *
 * Every pass builds the decoder's picture from the grey array itself
 * (RGBLuminanceSource), never through the library's own canvas source: its
 * rotate keeps the old width and height on the turned pixels, and a turned
 * frame that is not square then does not match its declared size.
 *
 * The library is loaded on first use, not at page load: the phone does
 * not pay for it until someone points the camera at something.
 * ------------------------------------------------------------------------- */

import { type Grey, type Pass, greyFromRgba, applyPass, PHOTO_PASSES, videoPass } from "./decode-ops";

export type Decoded = { text: string; format: string; pass: string };

type Zx = typeof import("@zxing/library");
let zx: Promise<Zx> | null = null;
const lib = () => (zx ??= import("@zxing/library"));

const FORMATS = ["QR_CODE", "DATA_MATRIX", "EAN_13", "EAN_8", "UPC_A", "UPC_E", "CODE_128", "CODE_39", "ITF"] as const;

let readerP: Promise<any> | null = null;
async function reader() {
  return (readerP ??= lib().then((Z) => {
    const hints = new Map<any, any>([
      [Z.DecodeHintType.POSSIBLE_FORMATS, FORMATS.map((f) => (Z.BarcodeFormat as any)[f]).filter((f) => f !== undefined)],
      [Z.DecodeHintType.TRY_HARDER, true],
    ]);
    const r = new Z.MultiFormatReader();
    r.setHints(hints);
    return r;
  }));
}

/** One attempt on one grey picture. Null when the decoder finds nothing. */
export async function decodeGrey(g: Grey, pass = "?"): Promise<Decoded | null> {
  const Z = await lib();
  const r = await reader();
  try {
    const source = new Z.RGBLuminanceSource(g.data, g.w, g.h);
    const result = r.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(source)));
    const text = result.getText();
    if (!text) return null;
    return { text, format: String(Z.BarcodeFormat[result.getBarcodeFormat()] ?? result.getBarcodeFormat()), pass };
  } catch {
    return null;
  }
}

/** Draw a source onto a canvas at most `max` px on its long side and take
 *  its grey. Done once per picture; the passes work on the array. */
function greyOf(img: CanvasImageSource, iw: number, ih: number, max: number): Grey {
  const scale = Math.min(1, max / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * scale)), h = Math.max(1, Math.round(ih * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, iw, ih, 0, 0, w, h);
  return greyFromRgba(ctx.getImageData(0, 0, w, h).data, w, h);
}

/** The passes in order over one grey picture; the first that reads wins. */
export async function decodeWithPasses(g: Grey, passes: Pass[]): Promise<Decoded | null> {
  for (const p of passes) {
    const r = await decodeGrey(applyPass(g, p), p.name);
    if (r) return r;
  }
  return null;
}

/** Decode a picture: a File from an <input type="file">, or any Blob. Null
 *  when nothing readable is in it — the caller says so in words. */
export async function decodeImageFile(file: Blob): Promise<Decoded | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That file is not a picture this browser can open."));
      el.src = url;
    });
    // 2000 on the long side keeps a 4k photo's detail for the magnified
    // passes while the whole-picture passes shrink it further themselves.
    return await decodeWithPasses(greyOf(img, img.naturalWidth, img.naturalHeight, 2000), PHOTO_PASSES);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Decode one frame of a playing <video>: one pass per call, chosen by the
 *  frame number so the passes are spread across frames (lib/decode-ops.ts
 *  `videoPass`) and a few frames a second stays cheap. The caller counts
 *  frames and passes the count in. */
export async function decodeVideoFrame(video: HTMLVideoElement, frame = 0): Promise<Decoded | null> {
  if (!video.videoWidth || !video.videoHeight) return null;
  const p = videoPass(frame);
  const g = greyOf(video, video.videoWidth, video.videoHeight, 1440);
  return decodeGrey(applyPass(g, p), p.name);
}

/** Whether this browser offers a live camera at all. It only does on a
 *  secure origin (HTTPS, or the desktop client declaring the box secure);
 *  on plain http the photo route is the camera. */
export function liveCameraPossible(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function";
}

/** What to ask the camera for, and what to do with what it gives. 2560×1440
 *  is asked for because real pixels beat any upscaling; continuous focus
 *  because a pack is held, not placed; and a little optical zoom where the
 *  lens offers it, for the same reason as the resolution. What was actually
 *  granted is returned to be shown, because a phone quietly gives less. */
export const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: { facingMode: { ideal: "environment" }, width: { ideal: 2560 }, height: { ideal: 1440 } },
  audio: false,
};

export async function tuneCameraTrack(track: MediaStreamTrack): Promise<{ width: number | null; height: number | null; zoom: number | null; focus: string | null }> {
  const caps: any = typeof track.getCapabilities === "function" ? track.getCapabilities() : {};
  const advanced: any[] = [];
  if (Array.isArray(caps.focusMode) && caps.focusMode.includes("continuous")) advanced.push({ focusMode: "continuous" });
  let zoom: number | null = null;
  if (caps.zoom && typeof caps.zoom.max === "number" && caps.zoom.max > 1) {
    // Enough to bring a pack at arm's length up to size; not so much that
    // the frame is a keyhole.
    zoom = Math.min(2, caps.zoom.max);
    advanced.push({ zoom });
  }
  if (advanced.length) {
    try { await track.applyConstraints({ advanced } as any); } catch { zoom = null; }
  }
  const s: any = typeof track.getSettings === "function" ? track.getSettings() : {};
  return { width: s.width ?? null, height: s.height ?? null, zoom: typeof s.zoom === "number" ? s.zoom : zoom, focus: s.focusMode ?? null };
}
