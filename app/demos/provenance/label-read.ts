// ————————————————————————————————————————————————————————————————
// Running the text reader on a label photo, in the browser.
//
// Adapted from South Moor's lib/vm-read.ts, which reads a medicine pack's
// licence line. The loading is the same: tesseract.js is fetched the first
// time a label is read, never at page load, from this site's /ocr folder if
// it carries the reader's files and from the library's internet copy if not.
// The record is the same: every pass's text and a small picture of what the
// reader saw, so a failed read can be explained rather than just reported.
//
// What differs: the whole photo is read rather than a band, because a tub
// label fills the frame; and a pass is confirmed when it gives a code on
// the product list and a date — the two things needed to know the lot.
// ————————————————————————————————————————————————————————————————

import {
  LABEL_PASSES,
  EMPTY_FIELDS,
  greyForOcr,
  labelScale,
  mergeFields,
  readLabelText,
  type LabelFields,
  type LabelRecord,
} from "./label-ocr";

// The photo, drawn once at the size the reader wants. Phone photos carry
// their rotation in the file; createImageBitmap applies it.
async function stillFromFile(file: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file);
  const scale = labelScale(bmp.width, bmp.height);
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * scale));
  c.height = Math.max(1, Math.round(bmp.height * scale));
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return c;
}

function prepared(still: HTMLCanvasElement, invert: boolean): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = still.width;
  c.height = still.height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(still, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  greyForOcr(img.data, invert);
  ctx.putImageData(img, 0, 0);
  return c;
}

function thumbnail(still: HTMLCanvasElement): string | null {
  try {
    const scale = Math.min(1, 520 / Math.max(1, still.width, still.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(still.width * scale));
    c.height = Math.max(1, Math.round(still.height * scale));
    c.getContext("2d")!.drawImage(still, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.65);
  } catch {
    return null;
  }
}

// ————————————————————————— loading the reader —————————————————————————

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loaded = { worker: any; PSM: Record<string, string>; from: "site" | "internet" };
let loaded: Promise<Loaded> | null = null;
let onProgress: ((note: string) => void) | null = null;
const STALL_MS = 90_000;

async function siteHasReader(): Promise<boolean> {
  try {
    const w = await fetch("/ocr/worker.min.js", { method: "HEAD" });
    if (!w.ok) return false;
    const l = await fetch("/ocr/eng.traineddata.gz", { method: "HEAD" });
    return l.ok;
  } catch {
    return false;
  }
}

export async function labelReader(progress?: (note: string) => void): Promise<Loaded> {
  onProgress = progress ?? null;
  return (loaded ??= (async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let T: any;
    try {
      T = await import("tesseract.js");
    } catch {
      throw new Error("The text reader is not installed on this site.");
    }
    const local = await siteHasReader();
    const origin = typeof location !== "undefined" ? location.origin : "";
    // A download that fails part-way leaves the reader waiting for ever
    // rather than failing, so if nothing has been heard from it for this
    // long, give up and say so. Generous, for a weak signal in a yard.
    let lastHeard = Date.now();
    const options: Record<string, unknown> = {
      logger: (m: { status?: string; progress?: number }) => {
        lastHeard = Date.now();
        if (!onProgress || !m?.status) return;
        const pct = typeof m.progress === "number" ? ` — ${Math.round(m.progress * 100)}%` : "";
        if (/loading|download|initializ/i.test(m.status))
          onProgress(`Fetching the text reader (about 15 MB the first time, then kept)${pct}`);
      },
    };
    if (local) {
      options.workerPath = `${origin}/ocr/worker.min.js`;
      options.corePath = `${origin}/ocr`;
      options.langPath = `${origin}/ocr`;
    }
    let watch: ReturnType<typeof setInterval> | undefined;
    try {
      const stalled = new Promise<never>((_, reject) => {
        watch = setInterval(() => {
          if (Date.now() - lastHeard > STALL_MS) reject(new Error("nothing arrived for 90 seconds — check the signal"));
        }, 2000);
      });
      const worker = await Promise.race([T.createWorker("eng", undefined, options), stalled]);
      return { worker, PSM: T.PSM, from: local ? "site" : "internet" } as Loaded;
    } catch (e) {
      throw new Error(
        `The text reader could not start (${e instanceof Error ? e.message : String(e)}). Type the code instead.`,
      );
    } finally {
      clearInterval(watch);
    }
  })().catch((e) => {
    loaded = null;
    throw e;
  }));
}

// Read a label photo: the passes in order, merging what each finds, and
// stopping at the first point where `confirm` accepts what has been read.
export async function readLabelPhoto(
  file: Blob,
  confirm: (f: LabelFields) => boolean,
  progress: (note: string) => void,
): Promise<LabelRecord> {
  const still = await stillFromFile(file);
  const thumb = thumbnail(still);
  const { worker, PSM, from } = await labelReader(progress);
  const passes: LabelRecord["passes"] = [];
  let fields: LabelFields = { ...EMPTY_FIELDS };
  let fullText = "";
  for (let i = 0; i < LABEL_PASSES.length; i++) {
    const p = LABEL_PASSES[i];
    progress(`Reading the label — pass ${i + 1} of ${LABEL_PASSES.length} (${p.label})`);
    await worker.setParameters({ tessedit_pageseg_mode: PSM[p.psm] });
    const result = await worker.recognize(prepared(still, p.invert), {}, { text: true, blocks: false, hocr: false, tsv: false });
    const text = String(result?.data?.text ?? "");
    passes.push({ label: p.label, text: text.replace(/[ \t]+/g, " ").trim() });
    fullText += "\n" + text;
    fields = mergeFields(fields, readLabelText(text));
    if (confirm(fields)) return { fields, passes, thumb, fullText, from, confirmed: true };
  }
  return { fields, passes, thumb, fullText, from, confirmed: false };
}
