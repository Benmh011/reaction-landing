"use client";

// ————————————————————————————————————————————————————————————————
// Scan a tub label.
//
// Built from South Moor's phone Scan screen and its scanner libraries. A
// photo of the label is tried as a barcode first (South Moor's decoder,
// unchanged), and where there is none — as on Salcombe Dairy's own labels —
// its words are read (South Moor's text reader, adapted in label-ocr.ts and
// label-read.ts).
//
// Two things are read from the label, separately:
//
//   - the batch number, printed after "Code" — that is the lot; and
//   - the product, from the description and the size.
//
// Then what the label says is compared with what our records say batch
// is. They agree nearly every time and the person never sees the check.
// When they do not, either the reader misread the number or the tub is
// mislabelled, and the two are shown side by side for the person to sort
// out before anything is saved.
//
// The batch and date can be typed instead, which is as quick as a camera
// in a freezer with gloves on.
//
// Booking stock in is not done here. A tub enters stock when its batch is
// saved on the Production records page, with the ingredients it used; a
// scan can only find, move, sell or waste a tub that is already recorded.
// ————————————————————————————————————————————————————————————————

import { useMemo, useRef, useState } from "react";
import {
  MATERIALS,
  LOCATIONS,
  balances,
  fmtDate,
  fmtQty,
  locationLabel,
  regimeFits,
  type Material,
  type Movement,
} from "./stock";
import {
  EMPTY_FIELDS,
  batchRecord,
  matchProduct,
  parseLabelDate,
  shortDate,
  type BatchRecord,
  type LabelFields,
  type LabelRecord,
} from "./label-ocr";
import { madeFrom } from "./batch-stock";

const GREEN = "#167a5b";
const VERM = "#c0392b";
const AMBER_FILL = "#eda83e";
const MUTED = "#5a6e85";
const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const card: React.CSSProperties = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--rule)",
  borderRadius: 12,
  padding: "16px 18px",
};
const input: React.CSSProperties = {
  font: "inherit",
  fontSize: 15,
  padding: "9px 12px",
  border: "1px solid var(--rule-strong)",
  borderRadius: 8,
  background: "var(--bg-elevated)",
  color: "inherit",
  minWidth: 0,
};
const ghost: React.CSSProperties = { border: "1px solid var(--rule-strong)" };

const FINISHED = () =>
  MATERIALS.filter((m) => m.kind === "finished").sort((a, b) => a.name.localeCompare(b.name));

// How the product on the confirm screen was arrived at, for saying so.
type ProductHow = "label" | "several" | "unread" | "record" | "barcode";

type Stage =
  | { name: "idle"; error?: string }
  | { name: "reading"; note: string }
  | {
      name: "confirm";
      record: LabelRecord | null;
      barcodeNote?: string;
      batch: string;
      date: string;
      productCode: string;
      how: ProductHow;
      options?: string[];
    }
  | { name: "found"; material: Material; batch: string; useBy: string; rec: BatchRecord | null };

type Action = "move" | "sold" | "waste";

function LineTag({ m }: { m: Material }) {
  if (m.line !== "ice cream" && m.line !== "chocolate") return null;
  return (
    <span
      style={{
        ...mono,
        display: "inline-block",
        fontSize: 9.5,
        letterSpacing: "0.12em",
        padding: "2px 7px",
        border: "1px solid var(--rule-strong)",
        borderRadius: 999,
        color: MUTED,
        whiteSpace: "nowrap",
      }}
    >
      {m.line === "chocolate" ? "CHOCOLATE" : "ICE CREAM"}
    </span>
  );
}

function Note({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 13.5, lineHeight: 1.55, borderLeft: `3px solid ${color}`, paddingLeft: 10, marginTop: 10 }}>
      {children}
    </p>
  );
}

// Of everything the passes read as a batch number, the first one our
// records know; failing that, the first one read at all.
function pickBatch(readings: LabelFields[], merged: LabelFields, movements: Movement[]): string | null {
  for (const r of readings) if (r.batch && batchRecord(r.batch, movements, MATERIALS)) return r.batch;
  return merged.batch;
}

export default function ScanTab({
  movements,
  operator = "",
  onBook,
}: {
  movements: Movement[];
  operator?: string;
  onBook: (ms: Movement[]) => void;
}) {
  const [stage, setStage] = useState<Stage>({ name: "idle" });
  const [typedBatch, setTypedBatch] = useState("");
  const [typedDate, setTypedDate] = useState("");
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Each photo gets a number; a reading that finishes after the person has
  // stopped it, or started another, is dropped.
  const run = useRef(0);

  async function readPhoto(file: File) {
    const me = ++run.current;
    const live = () => run.current === me;
    let barcodeNote: string | undefined;
    try {
      // Barcode first, exactly as South Moor does.
      setStage({ name: "reading", note: "Looking for a barcode" });
      const [{ decodeImageFile }, { readScan }] = await Promise.all([import("./decode-image"), import("./gs1")]);
      const dec = await decodeImageFile(file).catch(() => null);
      if (!live()) return;
      if (dec) {
        const scan = readScan(dec.text);
        const digits = scan.kind === "gtin" || scan.kind === "gs1" ? scan.gtin : null;
        const product = digits ? FINISHED().find((m) => m.gtin && m.gtin.padStart(14, "0") === digits) : undefined;
        const batch = scan.kind === "gs1" ? scan.batch : batchRecord(dec.text.trim(), movements, MATERIALS) ? dec.text.trim() : null;
        const expiry = scan.kind === "gs1" ? scan.expiry : null;
        if (product || batch) {
          setStage({
            name: "confirm",
            record: null,
            batch: batch ?? "",
            date: expiry ? shortDate(expiry) : "",
            productCode: product?.code ?? "",
            how: product ? "barcode" : "unread",
          });
          return;
        }
        barcodeNote = `A barcode was read (${dec.text}) but it is not one of ours, so the label's words were read instead.`;
      }

      // No usable barcode: read the words.
      const { readLabelPhoto } = await import("./label-read");
      const record = await readLabelPhoto(
        file,
        (f, text, readings) => {
          const b = pickBatch(readings, f, movements);
          return !!f.useBy && !!b && !!batchRecord(b, movements, MATERIALS) && matchProduct(f, text, MATERIALS).kind === "one";
        },
        (note) => live() && setStage({ name: "reading", note }),
      );
      if (!live()) return;
      const match = matchProduct(record.fields, record.fullText, MATERIALS);
      setStage({
        name: "confirm",
        record,
        barcodeNote,
        batch: pickBatch(record.readings, record.fields, movements) ?? "",
        date: record.fields.useBy ? shortDate(record.fields.useBy) : "",
        productCode: match.kind === "one" ? match.material.code : "",
        how: match.kind === "one" ? "label" : match.kind === "several" ? "several" : "unread",
        options: match.kind === "several" ? match.options.map((m) => m.code) : undefined,
      });
    } catch (e) {
      if (!live()) return;
      setStage({ name: "idle", error: e instanceof Error ? e.message : "That photo could not be read. Type the batch instead." });
    }
  }

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void readPhoto(f);
  }

  // Typed: only the batch and date are typed. The product is filled from
  // the batch's record for the person to check against the tub in hand.
  function lookUpTyped() {
    const rec = batchRecord(typedBatch.trim(), movements, MATERIALS);
    setStage({
      name: "confirm",
      record: null,
      batch: typedBatch.trim(),
      date: typedDate,
      productCode: rec?.materialCode ?? "",
      how: rec ? "record" : "unread",
    });
  }

  return (
    <>
      <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, maxWidth: 720, marginBottom: 18 }}>
        Photograph a tub's label, or type the batch number printed on it after "Code". The batch says which lot the tub
        is from; check what was read before anything is saved.
      </p>

      {stage.name === "idle" && (
        <>
          {stage.error && (
            <div style={{ ...card, borderLeft: `3px solid ${VERM}`, marginBottom: 16 }}>
              <p style={{ fontSize: 13.5, lineHeight: 1.55 }}>{stage.error}</p>
            </div>
          )}
          <div style={{ ...card, marginBottom: 16 }}>
            <p style={{ fontSize: 15, marginBottom: 12 }}>Scan a label</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={() => camRef.current?.click()}>
                Take a photo
              </button>
              <button className="btn" style={ghost} onClick={() => fileRef.current?.click()}>
                Choose a photo
              </button>
            </div>
            <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={pickFile} />
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickFile} />
            <p style={{ fontSize: 12.5, color: MUTED, marginTop: 10, lineHeight: 1.5 }}>
              Fill the frame with the label, straight on. Wipe off frost first if you can.
            </p>
          </div>

          <div style={{ ...card }}>
            <p style={{ fontSize: 15, marginBottom: 12 }}>Or type it from the label</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              <label style={{ display: "grid", gap: 4, fontSize: 12.5, color: MUTED }}>
                Batch (Code)
                <input
                  value={typedBatch}
                  autoComplete="off"
                  placeholder="1028"
                  onChange={(e) => setTypedBatch(e.target.value.replace(/[^A-Za-z0-9-]/g, "").toUpperCase().slice(0, 12))}
                  style={{ ...input, ...mono, width: 130, fontSize: 18, letterSpacing: "0.08em" }}
                />
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 12.5, color: MUTED }}>
                Use by
                <input
                  value={typedDate}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="04/12/27"
                  onChange={(e) => setTypedDate(e.target.value.slice(0, 10))}
                  style={{ ...input, ...mono, width: 130, fontSize: 18 }}
                />
              </label>
              <button
                className="btn btn-primary"
                disabled={typedBatch.trim().length < 2}
                style={{ opacity: typedBatch.trim().length < 2 ? 0.5 : 1 }}
                onClick={lookUpTyped}
              >
                Look up
              </button>
            </div>
          </div>
        </>
      )}

      {stage.name === "reading" && (
        <div style={{ ...card }}>
          <p style={{ fontSize: 15 }}>Reading the label…</p>
          <p style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>{stage.note}</p>
          <button
            className="btn"
            style={{ ...ghost, marginTop: 14 }}
            onClick={() => {
              run.current++;
              setStage({ name: "idle" });
            }}
          >
            Stop and type it instead
          </button>
        </div>
      )}

      {stage.name === "confirm" && (
        <Confirm
          stage={stage}
          movements={movements}
          onChange={(patch) => setStage({ ...stage, ...patch })}
          onBack={() => setStage({ name: "idle" })}
          onConfirm={(material, batch, useBy, rec) => setStage({ name: "found", material, batch, useBy, rec })}
        />
      )}

      {stage.name === "found" && (
        <Found
          material={stage.material}
          batch={stage.batch}
          useBy={stage.useBy}
          rec={stage.rec}
          movements={movements}
          operator={operator}
          onBook={onBook}
          onDone={() => {
            setTypedBatch("");
            setTypedDate("");
            setStage({ name: "idle" });
          }}
        />
      )}
    </>
  );
}

// ————————————————————————— confirm what was read —————————————————————————

function Confirm({
  stage,
  movements,
  onChange,
  onBack,
  onConfirm,
}: {
  stage: Extract<Stage, { name: "confirm" }>;
  movements: Movement[];
  onChange: (patch: Partial<Extract<Stage, { name: "confirm" }>>) => void;
  onBack: () => void;
  onConfirm: (m: Material, batch: string, useBy: string, rec: BatchRecord | null) => void;
}) {
  const r = stage.record;
  const iso = parseLabelDate(stage.date);
  const material = MATERIALS.find((m) => m.code === stage.productCode && m.kind === "finished") ?? null;
  const rec = stage.batch ? batchRecord(stage.batch, movements, MATERIALS) : null;

  // The label against our record of that batch.
  const productDiffers = !!rec && !!material && rec.materialCode !== material.code;
  const dateDiffers = !!rec && !!rec.useBy && !!iso && rec.useBy !== iso;
  const disagrees = productDiffers || dateDiffers;
  const ok = !!material && !!iso && !!stage.batch && !disagrees;

  const sizeRow = r?.fields.size;
  const fromLabel = r || stage.how === "barcode";

  return (
    <div style={{ ...card }}>
      <p style={{ fontSize: 15, marginBottom: 4 }}>{fromLabel ? "Check what was read" : "Check the batch"}</p>
      <p style={{ fontSize: 12.5, color: MUTED, marginBottom: 12 }}>
        Compare with the label. Correct anything that is wrong before going on.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <label style={{ display: "grid", gap: 4, fontSize: 12.5, color: MUTED }}>
          Batch (Code)
          <input
            value={stage.batch}
            onChange={(e) => onChange({ batch: e.target.value.replace(/[^A-Za-z0-9-]/g, "").toUpperCase().slice(0, 12) })}
            style={{ ...input, ...mono, width: 130, fontSize: 20, letterSpacing: "0.08em" }}
          />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 12.5, color: MUTED }}>
          {r?.fields.dateWords ?? "Use by"}
          <input
            value={stage.date}
            inputMode="numeric"
            placeholder="dd/mm/yy"
            onChange={(e) => onChange({ date: e.target.value.slice(0, 10) })}
            style={{ ...input, ...mono, width: 140, fontSize: 20 }}
          />
        </label>
        {sizeRow && (
          <div style={{ display: "grid", gap: 4, fontSize: 12.5, color: MUTED }}>
            Size
            <span style={{ ...mono, fontSize: 20, padding: "9px 0" }}>{sizeRow}</span>
          </div>
        )}
      </div>

      <label style={{ display: "grid", gap: 4, fontSize: 12.5, color: MUTED, marginTop: 12, maxWidth: 420 }}>
        Product
        <select
          value={stage.productCode}
          onChange={(e) => onChange({ productCode: e.target.value })}
          style={{ ...input, fontSize: 15 }}
        >
          <option value="">Choose the product…</option>
          {FINISHED().map((m) => (
            <option key={m.code} value={m.code}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      {material && (
        <div style={{ marginTop: 8 }}>
          <LineTag m={material} />
        </div>
      )}

      {stage.barcodeNote && <Note color={MUTED}>{stage.barcodeNote}</Note>}
      {stage.how === "several" && !material && (
        <Note color={AMBER_FILL}>
          The description fits more than one product (
          {(stage.options ?? []).map((c) => MATERIALS.find((m) => m.code === c)?.name ?? c).join(", ")}). Pick the one
          on the tub.
        </Note>
      )}
      {stage.how === "unread" && !material && fromLabel && (
        <Note color={AMBER_FILL}>The product could not be told from the label's description. Pick it from the list.</Note>
      )}
      {stage.how === "record" && material && !disagrees && (
        <Note color={MUTED}>Filled in from batch {rec?.batch}'s record. Check it is the tub in front of you.</Note>
      )}
      {!stage.batch && <Note color={AMBER_FILL}>No batch number was read. Type it from the label, after "Code".</Note>}
      {stage.batch && !rec && (
        <Note color={AMBER_FILL}>
          No batch {stage.batch} is recorded. Check the number against the label. If it is right, this batch was never
          booked into stock.
        </Note>
      )}
      {!iso && (
        <Note color={AMBER_FILL}>
          {stage.date ? "That date is not a real date. Check it." : "No date was read. Type the use-by date from the label."}
        </Note>
      )}

      {disagrees && rec && (
        <div style={{ marginTop: 14, border: `1px solid ${VERM}`, borderRadius: 10, padding: "12px 14px" }}>
          <p style={{ fontSize: 14, marginBottom: 10 }}>The label and our record of batch {rec.batch} do not agree.</p>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(70px, auto) 1fr 1fr", gap: "6px 12px", fontSize: 13.5 }}>
            <span />
            <span style={{ ...mono, fontSize: 10.5, letterSpacing: "0.12em", color: MUTED }}>ON THE LABEL</span>
            <span style={{ ...mono, fontSize: 10.5, letterSpacing: "0.12em", color: MUTED }}>OUR RECORD</span>
            <span style={{ color: MUTED }}>Product</span>
            <span style={{ color: productDiffers ? VERM : undefined }}>{material?.name ?? "—"}</span>
            <span style={{ color: productDiffers ? VERM : undefined }}>{rec.material?.name ?? rec.materialCode}</span>
            <span style={{ color: MUTED }}>Use by</span>
            <span style={{ ...mono, color: dateDiffers ? VERM : undefined }}>{iso ? shortDate(iso) : "—"}</span>
            <span style={{ ...mono, color: dateDiffers ? VERM : undefined }}>{rec.useBy ? shortDate(rec.useBy) : "—"}</span>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.55, marginTop: 10 }}>
            If the batch number was misread, correct it above, or use our record if the tub matches it. If the label
            really says this, the tub may be mislabelled: set it aside and tell whoever manages stock.
          </p>
          <button
            className="btn"
            style={{ ...ghost, marginTop: 10 }}
            onClick={() => onChange({ productCode: rec.materialCode, date: rec.useBy ? shortDate(rec.useBy) : stage.date })}
          >
            Use our record
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
        <button
          className="btn btn-primary"
          disabled={!ok}
          style={{ opacity: ok ? 1 : 0.5 }}
          onClick={() => material && iso && onConfirm(material, rec?.batch ?? stage.batch, iso, rec)}
        >
          That is right
        </button>
        <button className="btn" style={ghost} onClick={onBack}>
          Start again
        </button>
      </div>

      {r && (
        <details style={{ marginTop: 16 }}>
          <summary style={{ fontSize: 12.5, color: MUTED, cursor: "pointer" }}>What the reader saw</summary>
          {r.thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.thumb} alt="" style={{ display: "block", maxWidth: "100%", width: 260, borderRadius: 8, marginTop: 10 }} />
          )}
          {r.passes.map((p) => (
            <div key={p.label} style={{ marginTop: 10 }}>
              <p style={{ ...mono, fontSize: 10.5, letterSpacing: "0.12em", color: MUTED }}>{p.label.toUpperCase()}</p>
              <p style={{ ...mono, fontSize: 11.5, whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.5 }}>
                {p.text || "(nothing)"}
              </p>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

// ————————————————————————— the tub, and what to do with it —————————————————————————

function Found({
  material,
  batch,
  useBy,
  rec,
  movements,
  operator,
  onBook,
  onDone,
}: {
  material: Material;
  batch: string;
  useBy: string;
  rec: BatchRecord | null;
  movements: Movement[];
  operator: string;
  onBook: (ms: Movement[]) => void;
  onDone: () => void;
}) {
  const here = useMemo(
    () => balances(movements).filter((b) => b.materialCode === material.code && b.lot === batch && b.qty > 0),
    [movements, material.code, batch],
  );
  const inputs = useMemo(() => madeFrom(batch, movements), [movements, batch]);
  const [action, setAction] = useState<Action>("move");
  const [from, setFrom] = useState(here[0]?.locationId ?? "");
  const [to, setTo] = useState("");
  const [qty, setQty] = useState("1");
  const [done, setDone] = useState<string | null>(null);

  const fromRow = here.find((b) => b.locationId === from) ?? here[0];
  const n = Number(qty);
  const max = fromRow?.qty ?? 0;
  const destinations = LOCATIONS.filter(
    (l) => !l.holding && l.id !== fromRow?.locationId && regimeFits(material.regime, l),
  );
  const valid =
    !!fromRow && Number.isInteger(n) && n >= 1 && n <= max && (action !== "move" || destinations.some((d) => d.id === to));

  function record() {
    if (!valid || !fromRow) return;
    const now = Date.now();
    const at = fmtDate(new Date(now));
    const by = operator || "Scan";
    const ref = `SCAN-${now.toString(36).toUpperCase()}`;
    const base = {
      materialCode: material.code,
      lot: batch,
      unit: material.unit,
      ts: now,
      at,
      by,
      ref,
      bestBefore: fmtDate(new Date(`${useBy}T12:00:00`)),
    };
    const fromName = locationLabel(fromRow.location, fromRow.locationId);
    let ms: Movement[];
    let said: string;
    if (action === "move") {
      const dest = LOCATIONS.find((l) => l.id === to)!;
      ms = [
        { ...base, id: `sc-${now}-o`, locationId: fromRow.locationId, qty: -n, reason: "transfer-out" },
        { ...base, id: `sc-${now}-i`, locationId: dest.id, qty: n, reason: "transfer-in" },
      ];
      said = `Moved ${fmtQty(n, material.unit)} from ${fromName} to ${locationLabel(dest, dest.id)}.`;
    } else if (action === "sold") {
      ms = [{ ...base, id: `sc-${now}-s`, locationId: fromRow.locationId, qty: -n, reason: "sale", note: "Scanned at sale" }];
      said = `Recorded ${fmtQty(n, material.unit)} sold from ${fromName}.`;
    } else {
      ms = [{ ...base, id: `sc-${now}-w`, locationId: fromRow.locationId, qty: -n, reason: "waste", note: "Scanned as waste" }];
      said = `Recorded ${fmtQty(n, material.unit)} as waste at ${fromName}.`;
    }
    onBook(ms);
    setDone(said);
    setQty("1");
  }

  return (
    <div style={{ ...card }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 17 }}>{material.name}</span>
        <LineTag m={material} />
      </div>
      <p style={{ ...mono, fontSize: 12, color: MUTED, marginTop: 4 }}>
        <span style={{ whiteSpace: "nowrap" }}>Batch {batch}</span> ·{" "}
        <span style={{ whiteSpace: "nowrap" }}>Use by {shortDate(useBy)}</span>
        {rec && (
          <>
            {" "}
            · <span style={{ whiteSpace: "nowrap" }}>Made {rec.madeAt}</span>
          </>
        )}
      </p>

      {done && <Note color={GREEN}>{done}</Note>}

      <p style={{ ...mono, fontSize: 10.5, letterSpacing: "0.14em", color: MUTED, marginTop: 16, marginBottom: 8 }}>
        WHERE THIS BATCH IS
      </p>
      {here.length === 0 ? (
        <p style={{ fontSize: 13.5, lineHeight: 1.55 }}>
          No stock of batch {batch} is recorded. If the tub is in front of you, its batch was never booked in from
          Production records. Check with whoever manages stock.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {here.map((b) => (
            <div
              key={b.locationId}
              style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 14, padding: "6px 0", borderBottom: "1px solid var(--rule)" }}
            >
              <span>{locationLabel(b.location, b.locationId)}</span>
              <span style={{ ...mono, fontSize: 13 }}>{fmtQty(b.qty, b.unit)}</span>
            </div>
          ))}
        </div>
      )}

      {inputs.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary style={{ fontSize: 13, color: MUTED, cursor: "pointer" }}>What went into it</summary>
          <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
            {inputs.map((i) => (
              <div
                key={`${i.materialCode}|${i.lot}`}
                style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 13 }}
              >
                <span>
                  {i.material?.name ?? i.materialCode}{" "}
                  <span style={{ ...mono, fontSize: 11.5, color: MUTED, whiteSpace: "nowrap" }}>lot {i.lot}</span>
                </span>
                <span style={{ ...mono, fontSize: 12 }}>{fmtQty(i.qty, i.unit)}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {here.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 18 }}>
            {(
              [
                ["move", "Move"],
                ["sold", "Sold"],
                ["waste", "Waste"],
              ] as [Action, string][]
            ).map(([a, label]) => (
              <button
                key={a}
                className={action === a ? "btn btn-primary" : "btn"}
                style={action === a ? { fontSize: 13.5 } : { ...ghost, fontSize: 13.5 }}
                onClick={() => {
                  setAction(a);
                  setDone(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginTop: 14 }}>
            <label style={{ display: "grid", gap: 4, fontSize: 12.5, color: MUTED, flex: "1 1 200px", minWidth: 0 }}>
              From
              <select value={fromRow?.locationId ?? ""} onChange={(e) => setFrom(e.target.value)} style={{ ...input, fontSize: 14 }}>
                {here.map((b) => (
                  <option key={b.locationId} value={b.locationId}>
                    {locationLabel(b.location, b.locationId)} ({b.qty})
                  </option>
                ))}
              </select>
            </label>
            {action === "move" && (
              <label style={{ display: "grid", gap: 4, fontSize: 12.5, color: MUTED, flex: "1 1 200px", minWidth: 0 }}>
                To
                <select value={to} onChange={(e) => setTo(e.target.value)} style={{ ...input, fontSize: 14 }}>
                  <option value="">Choose where…</option>
                  {destinations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {locationLabel(l, l.id)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label style={{ display: "grid", gap: 4, fontSize: 12.5, color: MUTED }}>
              How many
              <input
                value={qty}
                inputMode="numeric"
                onChange={(e) => setQty(e.target.value.replace(/\D/g, "").slice(0, 5))}
                style={{ ...input, ...mono, width: 90, fontSize: 18 }}
              />
            </label>
          </div>
          {Number.isInteger(n) && n > max && (
            <p style={{ fontSize: 12.5, color: VERM, marginTop: 8 }}>Only {max} recorded there.</p>
          )}
        </>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
        {here.length > 0 && (
          <button className="btn btn-primary" disabled={!valid} style={{ opacity: valid ? 1 : 0.5 }} onClick={record}>
            {action === "move" ? "Record the move" : action === "sold" ? "Record as sold" : "Record as waste"}
          </button>
        )}
        <button className="btn" style={ghost} onClick={onDone}>
          Scan another
        </button>
      </div>
    </div>
  );
}
