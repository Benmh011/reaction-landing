// Turn files uploaded from the web composer into Bedrock content blocks,
// mirroring what the Teams bot does with its attachments. Bedrock's Converse API
// caps inline images at ~3.75MB and documents at ~4.5MB, so we guard those here.

import type { ContentBlock, ImageFormat, DocFormat } from "@/lib/articled/llm/bedrock";

const MAX_IMAGE = 3.75 * 1024 * 1024;
const MAX_DOC = 4.5 * 1024 * 1024;

const IMG_BY_TYPE: Record<string, ImageFormat> = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/gif": "gif",
  "image/webp": "webp",
};
const DOC_BY_TYPE: Record<string, DocFormat> = {
  "application/pdf": "pdf",
  "text/csv": "csv",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/html": "html",
  "text/plain": "txt",
  "text/markdown": "md",
};
const IMG_BY_EXT: Record<string, ImageFormat> = { png: "png", jpg: "jpeg", jpeg: "jpeg", gif: "gif", webp: "webp" };
const DOC_BY_EXT: Record<string, DocFormat> = {
  pdf: "pdf", csv: "csv", doc: "doc", docx: "docx", xls: "xls", xlsx: "xlsx", html: "html", htm: "html", txt: "txt", md: "md",
};

function ext(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

// Bedrock document names allow only alphanumerics, single spaces, hyphens,
// parentheses and square brackets.
function sanitizeName(name: string): string {
  const s = name.replace(/[^a-zA-Z0-9\s\-()[\]]/g, " ").replace(/\s+/g, " ").trim();
  return s || "document";
}

export async function buildWebAttachments(files: File[]): Promise<ContentBlock[]> {
  const blocks: ContentBlock[] = [];
  for (const f of files) {
    const type = (f.type || "").toLowerCase();
    const e = ext(f.name);
    const imgFmt = IMG_BY_TYPE[type] ?? IMG_BY_EXT[e];
    const docFmt = DOC_BY_TYPE[type] ?? DOC_BY_EXT[e];
    const bytes = new Uint8Array(await f.arrayBuffer());

    if (imgFmt) {
      if (bytes.byteLength > MAX_IMAGE) continue; // too big — skip (UI also guards)
      blocks.push({ image: { format: imgFmt, source: { bytes } } });
    } else if (docFmt) {
      if (bytes.byteLength > MAX_DOC) continue;
      blocks.push({ document: { format: docFmt, name: sanitizeName(f.name), source: { bytes } } });
    }
    // Unsupported type -> silently skipped.
  }
  return blocks;
}
