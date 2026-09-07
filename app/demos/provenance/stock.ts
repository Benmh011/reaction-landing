// ————————————————————————————————————————————————————————————————
// Provenance — the stock model.
//
// Warehouse to shops to vans, lot-tracked throughout. The shape is
// deliberately conservative: an append-only signed movement log, with
// every balance derived rather than stored. A stored balance is a number
// that can silently disagree with its own history; a derived one cannot.
//
// Units are not interchangeable. Milk arrives in litres, cocoa in kilos,
// finished tubs in units. Each material declares one canonical unit and
// a delivery that contradicts it is rejected rather than converted,
// because a silent conversion is how a stock figure stops being trusted.
// ————————————————————————————————————————————————————————————————

export type Unit = "L" | "kg" | "units";

// Packaging splits in two because the traceability requirement does.
//
// Primary packaging is a food-contact material: a tub, a lid, a wrapper
// touches product, carries its own declarations, and on this site carries
// the free-from claims in print. If a wrapper run is wrong — mislabelled
// allergens, a coating that fails migration testing — the lot code is
// what bounds the recall to that run instead of to a month's production.
//
// Secondary packaging is the outer case. It never touches product and
// carries no claim, so a supplier leaves the batch column blank because
// there is genuinely nothing to put in it. Demanding a lot code there
// teaches an operator to type something meaningless into a traceability
// field, which is worse than not asking.
export type MaterialKind = "raw" | "packaging-primary" | "packaging-secondary" | "finished";

export const KIND_LABEL: Record<MaterialKind, string> = {
  raw: "Raw material",
  "packaging-primary": "Primary packaging",
  "packaging-secondary": "Secondary packaging",
  finished: "Finished goods",
};

// Whether a lot or batch code must be captured at goods-in for this kind
// of material. Everything a recall could have to follow needs one.
export function lotRequired(kind: MaterialKind): boolean {
  return kind !== "packaging-secondary";
}

export type Material = {
  code: string;
  name: string;
  kind: MaterialKind;
  unit: Unit;
  // What this is usually bought as, shown when a delivery note is being
  // reviewed so an obviously wrong quantity stands out.
  typicalDelivery?: number;
  // Materials that must arrive cold. Goods-in temperature is checked
  // against this and raises an exception if it is out.
  maxIntakeTempC?: number;
  // Names a supplier's paperwork actually uses. Goods-in matching is
  // keyword based against these, never a guess at an unknown string.
  aliases: string[];
  allergenNote?: string;
};

// The register. Every material Estuary Creamery buys or makes.
export const MATERIALS: Material[] = [
  {
    code: "RM-MILK",
    name: "Whole milk",
    kind: "raw",
    unit: "L",
    typicalDelivery: 2000,
    maxIntakeTempC: 4,
    aliases: ["whole milk", "milk", "raw milk", "fresh milk"],
  },
  {
    code: "RM-CREAM",
    name: "Double cream",
    kind: "raw",
    unit: "L",
    typicalDelivery: 400,
    maxIntakeTempC: 4,
    aliases: ["double cream", "cream", "dbl cream"],
  },
  {
    code: "RM-COCOA",
    name: "Cocoa beans — origin lot",
    kind: "raw",
    unit: "kg",
    typicalDelivery: 500,
    aliases: ["cocoa beans", "cacao", "cocoa", "beans"],
  },
  {
    code: "RM-COUV",
    name: "Couverture 70%",
    kind: "raw",
    unit: "kg",
    typicalDelivery: 200,
    aliases: ["couverture", "chocolate couverture", "dark couverture", "70% couverture"],
  },
  {
    code: "RM-SUGAR",
    name: "Granulated sugar",
    kind: "raw",
    unit: "kg",
    typicalDelivery: 1000,
    aliases: ["sugar", "granulated sugar", "caster sugar", "sucrose"],
  },
  {
    code: "RM-GLUC",
    name: "Glucose syrup",
    kind: "raw",
    unit: "kg",
    typicalDelivery: 250,
    aliases: ["glucose", "glucose syrup", "liquid glucose"],
  },
  {
    code: "RM-STAB",
    name: "Stabiliser blend",
    kind: "raw",
    unit: "kg",
    typicalDelivery: 25,
    aliases: ["stabiliser", "stabilizer", "stabiliser blend", "emulsifier"],
  },
  {
    code: "RM-VAN",
    name: "Vanilla extract",
    kind: "raw",
    unit: "L",
    typicalDelivery: 10,
    aliases: ["vanilla", "vanilla extract", "vanilla essence"],
  },
  {
    code: "RM-FRUIT",
    name: "Fruit purée — seasonal",
    kind: "raw",
    unit: "kg",
    typicalDelivery: 120,
    maxIntakeTempC: 4,
    aliases: ["fruit puree", "fruit purée", "puree", "strawberry puree", "raspberry puree"],
  },
  {
    code: "PK-TUB2",
    name: "2L catering tub",
    kind: "packaging-primary",
    unit: "units",
    typicalDelivery: 2000,
    aliases: ["2l tub", "catering tub", "2 litre tub", "tubs 2l"],
  },
  {
    code: "PK-TUB500",
    name: "500ml retail tub",
    kind: "packaging-primary",
    unit: "units",
    typicalDelivery: 5000,
    aliases: ["500ml tub", "retail tub", "500 ml tub"],
  },
  {
    code: "PK-LID",
    name: "Tub lid",
    kind: "packaging-primary",
    unit: "units",
    typicalDelivery: 7000,
    aliases: ["lid", "lids", "tub lid"],
  },
  {
    code: "PK-BAR",
    name: "Bar wrapper — 100g",
    kind: "packaging-primary",
    unit: "units",
    typicalDelivery: 3000,
    aliases: ["bar wrapper", "wrapper", "100g wrapper", "foil wrap"],
  },
  {
    code: "PK-CASE",
    name: "Outer case",
    kind: "packaging-secondary",
    unit: "units",
    typicalDelivery: 500,
    aliases: ["outer case", "case", "carton", "shipper"],
  },
  {
    code: "FG-VAN2",
    name: "Vanilla — 2L catering",
    kind: "finished",
    unit: "units",
    maxIntakeTempC: -18,
    aliases: ["vanilla 2l"],
  },
  {
    code: "FG-SALT2",
    name: "Salted caramel — 2L catering",
    kind: "finished",
    unit: "units",
    maxIntakeTempC: -18,
    aliases: ["salted caramel 2l"],
  },
  {
    code: "FG-BAR70",
    name: "70% dark bar — 100g",
    kind: "finished",
    unit: "units",
    aliases: ["70% bar", "dark bar"],
  },
];

export function materialByCode(code: string): Material | undefined {
  return MATERIALS.find((m) => m.code === code);
}

// Keyword match against the alias list. Deliberately requires a real
// substring hit — an unmatched line queues for a person rather than
// being assigned to the nearest-looking material.
export function matchMaterial(raw: string): Material | null {
  const s = raw.toLowerCase().trim();
  if (!s) return null;

  const exact = MATERIALS.find((m) => m.code.toLowerCase() === s || m.name.toLowerCase() === s);
  if (exact) return exact;

  let best: { m: Material; len: number } | null = null;
  for (const m of MATERIALS) {
    for (const a of m.aliases) {
      if (s.includes(a) && (!best || a.length > best.len)) best = { m, len: a.length };
    }
  }
  return best ? best.m : null;
}

// ————————————————————————— locations —————————————————————————

export type LocationKind = "warehouse" | "shop" | "van";

export type StockLocation = {
  id: string;
  name: string;
  kind: LocationKind;
  site: string;
};

// A van is a location, not a site. That distinction is what lets stock
// on a vehicle be counted, traced and reconciled like anything else.
export const LOCATIONS: StockLocation[] = [
  { id: "WH-DRY", name: "Dry goods store", kind: "warehouse", site: "Island Street" },
  { id: "WH-COLD", name: "Coldstore A", kind: "warehouse", site: "Island Street" },
  { id: "WH-DISP", name: "Dispatch holding", kind: "warehouse", site: "Island Street" },
  // Stock that arrived out of spec and was taken in pending a quality
  // decision. Physically on site, deliberately not free to use.
  { id: "WH-QUAR", name: "Quarantine hold", kind: "warehouse", site: "Island Street" },
  { id: "VAN-1", name: "Van 1 — South Hams round", kind: "van", site: "Mobile" },
  { id: "VAN-2", name: "Van 2 — Bristol / Bath round", kind: "van", site: "Mobile" },
  { id: "SH-ISL", name: "Shop — Island Street", kind: "shop", site: "Salcombe" },
  { id: "SH-STG", name: "Shop — Strete Gate", kind: "shop", site: "Strete" },
  { id: "SH-PUL", name: "Shop — Pulteney Bridge", kind: "shop", site: "Bath" },
];

export function locationById(id: string): StockLocation | undefined {
  return LOCATIONS.find((l) => l.id === id);
}

// ————————————————————————— movements —————————————————————————

export type MovementReason =
  | "goods-in"
  | "transfer-out"
  | "transfer-in"
  | "production-consume"
  | "production-yield"
  | "sale"
  | "waste"
  | "adjustment";

// Signed and append-only. A correction is a further movement, never an
// edit — so the log always explains how the balance got where it is.
export type Movement = {
  id: string;
  materialCode: string;
  lot: string;
  locationId: string;
  qty: number; // signed: positive in, negative out
  unit: Unit;
  reason: MovementReason;
  at: string; // display date
  by: string;
  ref?: string; // delivery note number, transfer note, batch
  note?: string;
};

export const REASON_WORD: Record<MovementReason, string> = {
  "goods-in": "Goods in",
  "transfer-out": "Transfer out",
  "transfer-in": "Transfer in",
  "production-consume": "Consumed",
  "production-yield": "Produced",
  sale: "Sold",
  waste: "Waste",
  adjustment: "Adjustment",
};

// ————————————————————————— derived balances —————————————————————————

export type LotBalance = {
  materialCode: string;
  material: Material | undefined;
  lot: string;
  locationId: string;
  location: StockLocation | undefined;
  qty: number;
  unit: Unit;
};

export function balances(movements: Movement[]): LotBalance[] {
  const key = (m: Movement) => `${m.materialCode}|${m.lot}|${m.locationId}`;
  const acc = new Map<string, LotBalance>();

  for (const m of movements) {
    const k = key(m);
    const existing = acc.get(k);
    if (existing) {
      existing.qty += m.qty;
      continue;
    }
    acc.set(k, {
      materialCode: m.materialCode,
      material: materialByCode(m.materialCode),
      lot: m.lot,
      locationId: m.locationId,
      location: locationById(m.locationId),
      qty: m.qty,
      unit: m.unit,
    });
  }

  return [...acc.values()]
    .filter((b) => Math.abs(b.qty) > 0.0001)
    .sort(
      (a, b) =>
        (a.material?.name ?? a.materialCode).localeCompare(b.material?.name ?? b.materialCode) ||
        a.lot.localeCompare(b.lot),
    );
}

export type MaterialTotal = {
  material: Material;
  unit: Unit;
  total: number;
  lots: number;
  locations: number;
};

export function totalsByMaterial(movements: Movement[]): MaterialTotal[] {
  const bs = balances(movements);
  const out = new Map<string, MaterialTotal>();

  for (const b of bs) {
    if (!b.material) continue;
    const t = out.get(b.materialCode);
    if (t) {
      t.total += b.qty;
      t.lots += 1;
      continue;
    }
    out.set(b.materialCode, {
      material: b.material,
      unit: b.unit,
      total: b.qty,
      lots: 1,
      locations: 0,
    });
  }

  for (const t of out.values()) {
    t.locations = new Set(bs.filter((b) => b.materialCode === t.material.code).map((b) => b.locationId)).size;
  }

  return [...out.values()].sort((a, b) => a.material.name.localeCompare(b.material.name));
}

export function balancesAt(movements: Movement[], locationId: string): LotBalance[] {
  return balances(movements).filter((b) => b.locationId === locationId);
}

// Where a lot currently sits, across every location. This is the query a
// recall actually runs — it is the reason lot capture at goods-in matters.
export function whereIsLot(movements: Movement[], materialCode: string, lot: string): LotBalance[] {
  return balances(movements).filter((b) => b.materialCode === materialCode && b.lot === lot);
}

export function fmtQty(qty: number, unit: Unit): string {
  const n = Math.abs(qty) >= 100 ? Math.round(qty) : Math.round(qty * 10) / 10;
  return `${n.toLocaleString("en-GB")} ${unit}`;
}

// ————————————————————————— opening stock —————————————————————————
//
// A plausible morning position: raw materials in the dry store and
// coldstore, finished goods split between dispatch, the vans and the
// shops. Lot codes follow the convention already used elsewhere in the
// demo (supplier initials, then date).

export const SEED_MOVEMENTS: Movement[] = [
  mv("m01", "RM-MILK", "HF-070726", "WH-COLD", 1850, "L", "goods-in", "07 Jul 2026", "M. Reeve", "HF-DN-4471"),
  mv("m02", "RM-CREAM", "HF-070726-C", "WH-COLD", 380, "L", "goods-in", "07 Jul 2026", "M. Reeve", "HF-DN-4471"),
  mv("m03", "RM-COCOA", "PE-2606-11", "WH-DRY", 500, "kg", "goods-in", "22 Jun 2026", "A. Voss", "IMP-9902"),
  mv("m04", "RM-COUV", "CV-2605-08", "WH-DRY", 180, "kg", "goods-in", "19 Jun 2026", "A. Voss", "IMP-9871"),
  mv("m05", "RM-SUGAR", "BS-9911-K", "WH-DRY", 940, "kg", "goods-in", "01 Jul 2026", "J. Okafor", "BS-77120"),
  mv("m06", "RM-GLUC", "GS-2606-02", "WH-DRY", 210, "kg", "goods-in", "28 Jun 2026", "J. Okafor", "BS-77120"),
  mv("m07", "RM-STAB", "ST-2604-19", "WH-DRY", 18, "kg", "goods-in", "14 Jun 2026", "A. Voss", "ING-3341"),
  mv("m08", "RM-VAN", "VN-2603-07", "WH-DRY", 7.5, "L", "goods-in", "03 Jun 2026", "A. Voss", "ING-3288"),
  mv("m09", "PK-TUB2", "PKG-2606-A", "WH-DRY", 1740, "units", "goods-in", "24 Jun 2026", "J. Okafor", "PKG-5510"),
  mv("m10", "PK-TUB500", "PKG-2606-B", "WH-DRY", 4200, "units", "goods-in", "24 Jun 2026", "J. Okafor", "PKG-5510"),
  mv("m11", "PK-LID", "PKG-2606-C", "WH-DRY", 6100, "units", "goods-in", "24 Jun 2026", "J. Okafor", "PKG-5510"),
  mv("m12", "PK-CASE", "PKG-2605-D", "WH-DRY", 310, "units", "goods-in", "11 Jun 2026", "J. Okafor", "PKG-5480"),

  // Batch IC-2607-14 — the one already traced elsewhere in the demo.
  mv("m13", "FG-SALT2", "IC-2607-14", "WH-DISP", 412, "units", "production-yield", "07 Jul 2026", "M. Reeve", "IC-2607-14"),
  mv("m14", "FG-SALT2", "IC-2607-14", "WH-DISP", -96, "units", "transfer-out", "09 Jul 2026", "M. Reeve", "TN-2211"),
  mv("m15", "FG-SALT2", "IC-2607-14", "VAN-1", 96, "units", "transfer-in", "09 Jul 2026", "M. Reeve", "TN-2211"),
  mv("m16", "FG-SALT2", "IC-2607-14", "WH-DISP", -120, "units", "transfer-out", "09 Jul 2026", "S. Trent", "TN-2212"),
  mv("m17", "FG-SALT2", "IC-2607-14", "SH-ISL", 120, "units", "transfer-in", "09 Jul 2026", "S. Trent", "TN-2212"),
  mv("m18", "FG-SALT2", "IC-2607-14", "WH-DISP", -84, "units", "transfer-out", "11 Jul 2026", "J. Okafor", "TN-2219"),
  mv("m19", "FG-SALT2", "IC-2607-14", "VAN-2", 84, "units", "transfer-in", "11 Jul 2026", "J. Okafor", "TN-2219"),
  mv("m20", "FG-SALT2", "IC-2607-14", "SH-ISL", -38, "units", "sale", "10 Jul 2026", "Shop till", undefined, "Counter sales"),

  mv("m21", "FG-VAN2", "IC-2607-22", "WH-DISP", 640, "units", "production-yield", "08 Jul 2026", "M. Reeve", "IC-2607-22"),
  mv("m22", "FG-VAN2", "IC-2607-22", "WH-DISP", -110, "units", "transfer-out", "09 Jul 2026", "S. Trent", "TN-2213"),
  mv("m23", "FG-VAN2", "IC-2607-22", "SH-PUL", 110, "units", "transfer-in", "10 Jul 2026", "S. Trent", "TN-2213"),
  mv("m24", "FG-VAN2", "IC-2607-22", "SH-PUL", -27, "units", "sale", "11 Jul 2026", "Shop till", undefined, "Counter sales"),
  mv("m25", "FG-VAN2", "IC-2607-22", "WH-DISP", -8, "units", "waste", "09 Jul 2026", "A. Voss", undefined, "Seal failure on pack-off"),

  mv("m26", "FG-BAR70", "CH-2606-04", "WH-DISP", 880, "units", "production-yield", "26 Jun 2026", "A. Voss", "CH-2606-04"),
  mv("m27", "FG-BAR70", "CH-2606-04", "SH-STG", -0, "units", "adjustment", "26 Jun 2026", "A. Voss", undefined, "Opening"),
  mv("m28", "FG-BAR70", "CH-2606-04", "WH-DISP", -150, "units", "transfer-out", "01 Jul 2026", "S. Trent", "TN-2201"),
  mv("m29", "FG-BAR70", "CH-2606-04", "SH-STG", 150, "units", "transfer-in", "01 Jul 2026", "S. Trent", "TN-2201"),

  // Consumption against the traced batch, so the inputs reconcile.
  mv("m30", "RM-MILK", "HF-070726", "WH-COLD", -780, "L", "production-consume", "07 Jul 2026", "M. Reeve", "IC-2607-14"),
  mv("m31", "RM-SUGAR", "BS-9911-K", "WH-DRY", -94, "kg", "production-consume", "07 Jul 2026", "M. Reeve", "IC-2607-14"),
  mv("m32", "PK-TUB2", "PKG-2606-A", "WH-DRY", -412, "units", "production-consume", "07 Jul 2026", "M. Reeve", "IC-2607-14"),
];

function mv(
  id: string,
  materialCode: string,
  lot: string,
  locationId: string,
  qty: number,
  unit: Unit,
  reason: MovementReason,
  at: string,
  by: string,
  ref?: string,
  note?: string,
): Movement {
  return { id, materialCode, lot, locationId, qty, unit, reason, at, by, ref, note };
}
