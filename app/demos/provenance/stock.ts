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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

// ————————————————————————— ingredient category —————————————————————————
//
// A finer split than "raw material", because each of these behaves
// differently on storage, shelf life, lead time and risk — which is what
// makes the grouping worth having rather than decoration.

export type Category =
  | "dairy"
  | "cocoa"
  | "sugars"
  | "functional"
  | "flavours"
  | "fruit"
  | "packaging"
  | "finished";

export const CATEGORY_LABEL: Record<Category, string> = {
  dairy: "Dairy",
  cocoa: "Cocoa and chocolate",
  sugars: "Sugars and syrups",
  functional: "Functional ingredients",
  flavours: "Flavours and inclusions",
  fruit: "Fruit and fresh",
  packaging: "Packaging",
  finished: "Finished goods",
};

// ————————————————————————— storage regime —————————————————————————
//
// Where a material is allowed to be held. Declared on the material rather
// than assumed from its kind, because a dairy holds ambient, chilled,
// frozen and conditioned stock side by side and the wrong one spoils
// product quietly.

export type Regime = "ambient" | "chilled" | "frozen" | "conditioned";

export const REGIME_LABEL: Record<Regime, string> = {
  ambient: "Ambient",
  chilled: "Chilled",
  frozen: "Frozen",
  conditioned: "Conditioned",
};

export const REGIME_SPEC: Record<Regime, string> = {
  ambient: "Dry, 10–20°C",
  chilled: "0–4°C",
  frozen: "−18°C or below",
  conditioned: "14–18°C, 45–55%RH",
};

// ————————————————————————— allergens —————————————————————————
//
// The site is nut, gluten, egg, soya and palm-oil free, and every trade
// questionnaire answer and pack claim rests on that. Goods-in stops a
// prohibited material at the door — but stock already held needs to be
// answerable too, because an auditor asks to see the whole register and
// its declarations, not just today's delivery.
//
// Milk is the one allergen genuinely present: they are a dairy. Saying so
// plainly is what makes the free-from claims credible.

export type Allergen = "milk";

export const ALLERGEN_LABEL: Record<Allergen, string> = {
  milk: "Milk",
};

// The claims the site makes across the whole factory.
export const SITE_FREE_FROM = ["nut", "gluten", "egg", "soya", "palm oil"] as const;

export type Material = {
  code: string;
  name: string;
  kind: MaterialKind;
  category: Category;
  unit: Unit;
  // Where this may be held. A booking into a location that cannot meet
  // it is refused rather than silently accepted.
  regime: Regime;
  // What this is usually bought as, shown when a delivery note is being
  // reviewed so an obviously wrong quantity stands out.
  typicalDelivery?: number;
  // Materials that must arrive cold. Goods-in temperature is checked
  // against this and raises an exception if it is out.
  maxIntakeTempC?: number;
  // Names a supplier's paperwork actually uses. Goods-in matching is
  // keyword based against these, never a guess at an unknown string.
  aliases: string[];
  // Allergens genuinely present in this material.
  allergens: Allergen[];
  // Whether a current supplier declaration is held. A material with no
  // declaration is not a crisis, but it is the gap an auditor finds, so
  // it is stated rather than assumed.
  declarationOnFile: boolean;
  declarationReviewed?: string;
  // Typical shelf life from delivery, in days. Used to estimate a best
  // before where a note did not carry one.
  shelfLifeDays?: number;
  // Where it came from. Cocoa arrives from an identified origin lot and
  // milk from one named farm — the claim a bean-to-bar story rests on.
  origin?: string;
  supplier?: string;
  // Which side of the business uses it. They are effectively two
  // factories sharing a building, with opposite seasons and opposite
  // storage regimes.
  line?: "ice cream" | "chocolate" | "both";
  allergenNote?: string;
};

// Whether a location can hold a material under its regime.
export function regimeFits(regime: Regime, loc: StockLocation): boolean {
  return loc.regimes.includes(regime);
}

// The register. Every material Estuary Creamery buys or makes.
export const MATERIALS: Material[] = [
  {
    code: "RM-MILK",
    name: "Whole milk",
    kind: "raw",
    category: "dairy",
    unit: "L",
    regime: "chilled",
    typicalDelivery: 2000,
    maxIntakeTempC: 4,
    aliases: ["whole milk", "milk", "raw milk", "fresh milk"],
    allergens: ["milk"],
    declarationOnFile: true,
    declarationReviewed: "02 Jul 2026",
    shelfLifeDays: 5,
    origin: "Home Farm, Kingsbridge",
    supplier: "Home Farm",
    line: "both",
  },
  {
    code: "RM-CREAM",
    name: "Double cream",
    kind: "raw",
    category: "dairy",
    unit: "L",
    regime: "chilled",
    typicalDelivery: 400,
    maxIntakeTempC: 4,
    aliases: ["double cream", "cream", "dbl cream"],
    allergens: ["milk"],
    declarationOnFile: true,
    declarationReviewed: "02 Jul 2026",
    shelfLifeDays: 7,
    origin: "Home Farm, Kingsbridge",
    supplier: "Home Farm",
    line: "both",
  },
  {
    code: "RM-COCOA",
    name: "Cocoa beans — origin lot",
    kind: "raw",
    category: "cocoa",
    unit: "kg",
    regime: "ambient",
    typicalDelivery: 500,
    aliases: ["cocoa beans", "cacao", "cocoa", "beans"],
    allergens: [],
    declarationOnFile: false,
    shelfLifeDays: 540,
    origin: "Piura, Peru — single estate",
    supplier: "Specialist importer",
    line: "chocolate",
  },
  {
    code: "RM-COUV",
    name: "Couverture 70%",
    kind: "raw",
    category: "cocoa",
    unit: "kg",
    regime: "conditioned",
    typicalDelivery: 200,
    aliases: ["couverture", "chocolate couverture", "dark couverture", "70% couverture"],
    allergens: [],
    declarationOnFile: true,
    declarationReviewed: "19 Jun 2026",
    shelfLifeDays: 365,
    origin: "Blended origin",
    supplier: "Specialist importer",
    line: "chocolate",
  },
  {
    code: "RM-SUGAR",
    name: "Granulated sugar",
    kind: "raw",
    category: "sugars",
    unit: "kg",
    regime: "ambient",
    typicalDelivery: 1000,
    aliases: ["sugar", "granulated sugar", "caster sugar", "sucrose"],
    allergens: [],
    declarationOnFile: true,
    declarationReviewed: "14 Apr 2026",
    shelfLifeDays: 730,
    supplier: "British Sugar",
    line: "both",
  },
  {
    code: "RM-GLUC",
    name: "Glucose syrup",
    kind: "raw",
    category: "sugars",
    unit: "kg",
    regime: "ambient",
    typicalDelivery: 250,
    aliases: ["glucose", "glucose syrup", "liquid glucose"],
    allergens: [],
    declarationOnFile: true,
    declarationReviewed: "14 Apr 2026",
    shelfLifeDays: 365,
    supplier: "Westridge Food Ingredients",
    line: "ice cream",
  },
  {
    code: "RM-STAB",
    name: "Stabiliser blend",
    kind: "raw",
    category: "functional",
    unit: "kg",
    regime: "ambient",
    typicalDelivery: 25,
    aliases: ["stabiliser", "stabilizer", "stabiliser blend", "emulsifier"],
    allergens: [],
    declarationOnFile: true,
    declarationReviewed: "11 May 2026",
    shelfLifeDays: 540,
    supplier: "Westridge Food Ingredients",
    line: "ice cream",
    allergenNote: "Soya-free lecithin confirmed — declaration held.",
  },
  {
    code: "RM-VAN",
    name: "Vanilla extract",
    kind: "raw",
    category: "flavours",
    unit: "L",
    regime: "ambient",
    typicalDelivery: 10,
    aliases: ["vanilla", "vanilla extract", "vanilla essence"],
    allergens: [],
    declarationOnFile: true,
    declarationReviewed: "03 Jun 2026",
    shelfLifeDays: 1095,
    origin: "Madagascar",
    supplier: "Westridge Food Ingredients",
    line: "both",
  },
  {
    code: "RM-FRUIT",
    name: "Fruit purée — seasonal",
    kind: "raw",
    category: "fruit",
    unit: "kg",
    regime: "chilled",
    typicalDelivery: 120,
    maxIntakeTempC: 4,
    aliases: ["fruit puree", "fruit purée", "puree", "strawberry puree", "raspberry puree"],
    allergens: [],
    declarationOnFile: false,
    shelfLifeDays: 14,
    origin: "South Devon growers",
    supplier: "Westridge Food Ingredients",
    line: "ice cream",
  },
  {
    code: "PK-TUB2",
    name: "2L catering tub",
    kind: "packaging-primary",
    category: "packaging",
    unit: "units",
    regime: "ambient",
    typicalDelivery: 2000,
    aliases: ["2l tub", "catering tub", "2 litre tub", "tubs 2l"],
    allergens: [],
    declarationOnFile: true,
    declarationReviewed: "24 Jun 2026",
    supplier: "Packaging supplier",
    line: "ice cream",
  },
  {
    code: "PK-TUB500",
    name: "500ml retail tub",
    kind: "packaging-primary",
    category: "packaging",
    unit: "units",
    regime: "ambient",
    typicalDelivery: 5000,
    aliases: ["500ml tub", "retail tub", "500 ml tub"],
    allergens: [],
    declarationOnFile: true,
    declarationReviewed: "24 Jun 2026",
    supplier: "Packaging supplier",
    line: "ice cream",
  },
  {
    code: "PK-LID",
    name: "Tub lid",
    kind: "packaging-primary",
    category: "packaging",
    unit: "units",
    regime: "ambient",
    typicalDelivery: 7000,
    aliases: ["lid", "lids", "tub lid"],
    allergens: [],
    declarationOnFile: true,
    declarationReviewed: "24 Jun 2026",
    supplier: "Packaging supplier",
    line: "ice cream",
  },
  {
    code: "PK-BAR",
    name: "Bar wrapper — 100g",
    kind: "packaging-primary",
    category: "packaging",
    unit: "units",
    regime: "ambient",
    typicalDelivery: 3000,
    aliases: ["bar wrapper", "wrapper", "100g wrapper", "foil wrap"],
    allergens: [],
    declarationOnFile: false,
    supplier: "Packaging supplier",
    line: "chocolate",
    allergenNote: "Carries the printed free-from claims — a print run has to be traceable.",
  },
  {
    code: "PK-CASE",
    name: "Outer case",
    kind: "packaging-secondary",
    category: "packaging",
    unit: "units",
    regime: "ambient",
    typicalDelivery: 500,
    aliases: ["outer case", "case", "carton", "shipper"],
    allergens: [],
    declarationOnFile: true,
    declarationReviewed: "11 Jun 2026",
    supplier: "Packaging supplier",
    line: "both",
  },
  {
    code: "FG-VAN2",
    name: "Vanilla — 2L catering",
    kind: "finished",
    category: "finished",
    unit: "units",
    regime: "frozen",
    maxIntakeTempC: -18,
    aliases: ["vanilla 2l", "vanilla ice cream", "ice cream vanilla"],
    allergens: ["milk"],
    declarationOnFile: true,
    shelfLifeDays: 365,
    line: "ice cream",
  },
  {
    code: "FG-SALT2",
    name: "Salted caramel — 2L catering",
    kind: "finished",
    category: "finished",
    unit: "units",
    regime: "frozen",
    maxIntakeTempC: -18,
    aliases: ["salted caramel 2l", "salted caramel", "caramel ice cream"],
    allergens: ["milk"],
    declarationOnFile: true,
    shelfLifeDays: 365,
    line: "ice cream",
  },
  {
    code: "FG-BAR70",
    name: "70% dark bar — 100g",
    kind: "finished",
    category: "finished",
    unit: "units",
    regime: "conditioned",
    aliases: ["70% bar", "dark bar", "chocolate bar", "dark chocolate", "chocolate"],
    allergens: [],
    declarationOnFile: true,
    shelfLifeDays: 540,
    origin: "Piura, Peru — single estate",
    line: "chocolate",
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
  // Which storage regimes this place can actually hold. A booking that
  // puts chilled cream in a dry store is refused rather than silently
  // accepted, because that is how product spoils without anyone noticing
  // a mistake was made.
  regimes: Regime[];
  // Stock here is on site but not free to use.
  holding?: boolean;
};

// A van is a location, not a site. That distinction is what lets stock
// on a vehicle be counted, traced and reconciled like anything else.
export const LOCATIONS: StockLocation[] = [
  { id: "WH-DRY", name: "Dry goods store", kind: "warehouse", site: "Island Street", regimes: ["ambient"] },
  { id: "WH-CHILL", name: "Chill store", kind: "warehouse", site: "Island Street", regimes: ["chilled"] },
  { id: "WH-COLD", name: "Coldstore A", kind: "warehouse", site: "Island Street", regimes: ["frozen"] },
  {
    id: "WH-COND",
    name: "Chocolate conditioning room",
    kind: "warehouse",
    site: "Island Street",
    regimes: ["conditioned"],
  },
  { id: "WH-DISP", name: "Dispatch holding", kind: "warehouse", site: "Island Street", regimes: ["frozen", "conditioned"] },
  // Stock that arrived out of spec and was taken in pending a quality
  // decision. Physically on site, deliberately not free to use. It holds
  // every regime because whatever arrived wrong still has to go
  // somewhere while the decision is made.
  {
    id: "WH-QUAR",
    name: "Quarantine hold",
    kind: "warehouse",
    site: "Island Street",
    regimes: ["ambient", "chilled", "frozen", "conditioned"],
    holding: true,
  },
  { id: "VAN-1", name: "Van 1 — South Hams round", kind: "van", site: "Mobile", regimes: ["frozen"] },
  { id: "VAN-2", name: "Van 2 — Bristol / Bath round", kind: "van", site: "Mobile", regimes: ["frozen"] },
  { id: "SH-ISL", name: "Shop — Island Street", kind: "shop", site: "Salcombe", regimes: ["frozen", "conditioned"] },
  { id: "SH-STG", name: "Shop — Strete Gate", kind: "shop", site: "Strete", regimes: ["frozen", "conditioned"] },
  { id: "SH-PUL", name: "Shop — Pulteney Bridge", kind: "shop", site: "Bath", regimes: ["frozen", "conditioned"] },
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
  // Carried from the delivery note so shelf life is answerable later.
  // Captured at goods-in and previously thrown away.
  bestBefore?: string;
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
  bestBefore?: string;
};

export function balances(movements: Movement[]): LotBalance[] {
  const key = (m: Movement) => `${m.materialCode}|${m.lot}|${m.locationId}`;
  const acc = new Map<string, LotBalance>();

  for (const m of movements) {
    const k = key(m);
    const existing = acc.get(k);
    if (existing) {
      existing.qty += m.qty;
      if (!existing.bestBefore && m.bestBefore) existing.bestBefore = m.bestBefore;
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
      bestBefore: m.bestBefore,
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
  mv("m01", "RM-MILK", "HF-260901", "WH-CHILL", 1850, "L", "goods-in", 1, "M. Reeve", "HF-DN-4471"),
  mv("m02", "RM-CREAM", "HF-260901-C", "WH-CHILL", 380, "L", "goods-in", 2, "M. Reeve", "HF-DN-4471"),
  mv("m03", "RM-COCOA", "PE-2606-11", "WH-DRY", 500, "kg", "goods-in", 77, "A. Voss", "IMP-9902"),
  mv("m04", "RM-COUV", "CV-2605-08", "WH-COND", 180, "kg", "goods-in", 80, "A. Voss", "IMP-9871"),
  mv("m05", "RM-SUGAR", "BS-9911-K", "WH-DRY", 940, "kg", "goods-in", 68, "J. Okafor", "BS-77120"),
  mv("m06", "RM-GLUC", "GS-2606-02", "WH-DRY", 210, "kg", "goods-in", 71, "J. Okafor", "BS-77120"),
  mv("m07", "RM-STAB", "ST-2604-19", "WH-DRY", 18, "kg", "goods-in", 85, "A. Voss", "ING-3341"),
  mv("m08", "RM-VAN", "VN-2603-07", "WH-DRY", 7.5, "L", "goods-in", 96, "A. Voss", "ING-3288"),
  mv("m09", "PK-TUB2", "PKG-2606-A", "WH-DRY", 1740, "units", "goods-in", 75, "J. Okafor", "PKG-5510"),
  mv("m10", "PK-TUB500", "PKG-2606-B", "WH-DRY", 4200, "units", "goods-in", 75, "J. Okafor", "PKG-5510"),
  mv("m11", "PK-LID", "PKG-2606-C", "WH-DRY", 6100, "units", "goods-in", 75, "J. Okafor", "PKG-5510"),
  mv("m12", "PK-CASE", "PKG-2605-D", "WH-DRY", 310, "units", "goods-in", 88, "J. Okafor", "PKG-5480"),

  // Batch IC-2607-14 — the one already traced elsewhere in the demo.
  mv("m13", "FG-SALT2", "IC-2607-14", "WH-DISP", 412, "units", "production-yield", 62, "M. Reeve", "IC-2607-14"),
  mv("m14", "FG-SALT2", "IC-2607-14", "WH-DISP", -96, "units", "transfer-out", 60, "M. Reeve", "TN-2211"),
  mv("m15", "FG-SALT2", "IC-2607-14", "VAN-1", 96, "units", "transfer-in", 60, "M. Reeve", "TN-2211"),
  mv("m16", "FG-SALT2", "IC-2607-14", "WH-DISP", -120, "units", "transfer-out", 60, "S. Trent", "TN-2212"),
  mv("m17", "FG-SALT2", "IC-2607-14", "SH-ISL", 120, "units", "transfer-in", 60, "S. Trent", "TN-2212"),
  mv("m18", "FG-SALT2", "IC-2607-14", "WH-DISP", -84, "units", "transfer-out", 58, "J. Okafor", "TN-2219"),
  mv("m19", "FG-SALT2", "IC-2607-14", "VAN-2", 84, "units", "transfer-in", 58, "J. Okafor", "TN-2219"),
  mv("m20", "FG-SALT2", "IC-2607-14", "SH-ISL", -38, "units", "sale", 59, "Shop till", undefined, "Counter sales"),

  mv("m21", "FG-VAN2", "IC-2607-22", "WH-DISP", 640, "units", "production-yield", 61, "M. Reeve", "IC-2607-22"),
  mv("m22", "FG-VAN2", "IC-2607-22", "WH-DISP", -110, "units", "transfer-out", 60, "S. Trent", "TN-2213"),
  mv("m23", "FG-VAN2", "IC-2607-22", "SH-PUL", 110, "units", "transfer-in", 59, "S. Trent", "TN-2213"),
  mv("m24", "FG-VAN2", "IC-2607-22", "SH-PUL", -27, "units", "sale", 58, "Shop till", undefined, "Counter sales"),
  mv("m25", "FG-VAN2", "IC-2607-22", "WH-DISP", -8, "units", "waste", 60, "A. Voss", undefined, "Seal failure on pack-off"),

  mv("m26", "FG-BAR70", "CH-2606-04", "WH-DISP", 880, "units", "production-yield", 73, "A. Voss", "CH-2606-04"),
  mv("m27", "FG-BAR70", "CH-2606-04", "SH-STG", -0, "units", "adjustment", 73, "A. Voss", undefined, "Opening"),
  mv("m28", "FG-BAR70", "CH-2606-04", "WH-DISP", -150, "units", "transfer-out", 68, "S. Trent", "TN-2201"),
  mv("m29", "FG-BAR70", "CH-2606-04", "SH-STG", 150, "units", "transfer-in", 68, "S. Trent", "TN-2201"),

  // Consumption against the traced batch, so the inputs reconcile.
  mv("m30", "RM-MILK", "HF-260901", "WH-CHILL", -780, "L", "production-consume", 1, "M. Reeve", "IC-2607-14"),
  mv("m31", "RM-SUGAR", "BS-9911-K", "WH-DRY", -94, "kg", "production-consume", 62, "M. Reeve", "IC-2607-14"),
  mv("m32", "PK-TUB2", "PKG-2606-A", "WH-DRY", -412, "units", "production-consume", 62, "M. Reeve", "IC-2607-14"),
];

function mv(
  id: string,
  materialCode: string,
  lot: string,
  locationId: string,
  qty: number,
  unit: Unit,
  reason: MovementReason,
  daysAgo: number,
  by: string,
  ref?: string,
  note?: string,
): Movement {
  // Seeded stock is dated relative to today rather than pinned to a
  // calendar date. A demo with hardcoded dates slowly fills up with
  // expired stock and starts telling the wrong story about the product;
  // the checks engine works the same way for the same reason.
  const at = fmtDate(addDays(new Date(), -daysAgo));

  const m = MATERIALS.find((x) => x.code === materialCode);
  const bestBefore = m?.shelfLifeDays
    ? fmtDate(addDays(new Date(), m.shelfLifeDays - daysAgo))
    : undefined;

  return { id, materialCode, lot, locationId, qty, unit, reason, at, by, ref, note, bestBefore };
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

export function fmtDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ————————————————————————— shelf life —————————————————————————
//
// Best-before dates are captured at goods-in and were previously shown
// nowhere. On a perishable product across six sites, knowing what is
// within a fortnight of its date is the difference between a markdown
// and a skip.

export type Freshness = "fresh" | "soon" | "urgent" | "expired" | "unknown";

export const FRESHNESS_LABEL: Record<Freshness, string> = {
  fresh: "In date",
  soon: "Use within a month",
  urgent: "Use this week",
  expired: "Past date",
  unknown: "No date held",
};

// Dates on delivery notes come in whatever the supplier types. Parse the
// common British forms and give up honestly on anything else rather than
// inventing a date that would go on to drive a decision.
export function parseNoteDate(raw?: string): Date | null {
  if (!raw) return null;
  const s = raw.trim();

  const named = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
  if (named) {
    const m = MONTHS.findIndex((x) => x.toLowerCase() === named[2].slice(0, 3).toLowerCase());
    if (m >= 0) return new Date(Number(named[3]), m, Number(named[1]));
  }

  // dd/mm/yyyy — British order, which is what a UK supplier note uses.
  const slashed = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashed) {
    const year = Number(slashed[3].length === 2 ? `20${slashed[3]}` : slashed[3]);
    return new Date(year, Number(slashed[2]) - 1, Number(slashed[1]));
  }

  return null;
}

export function freshnessOf(bestBefore?: string, today = new Date()): { state: Freshness; days: number | null } {
  const d = parseNoteDate(bestBefore);
  if (!d) return { state: "unknown", days: null };

  const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { state: "expired", days };
  if (days <= 7) return { state: "urgent", days };
  if (days <= 30) return { state: "soon", days };
  return { state: "fresh", days };
}

export const FRESHNESS_ORDER: Record<Freshness, number> = {
  expired: 0,
  urgent: 1,
  soon: 2,
  fresh: 3,
  unknown: 4,
};

export type ShelfLifeRow = { balance: LotBalance; state: Freshness; days: number | null };

export function shelfLife(movements: Movement[], today = new Date()): ShelfLifeRow[] {
  return balances(movements)
    .map((balance) => {
      const f = freshnessOf(balance.bestBefore, today);
      return { balance, state: f.state, days: f.days };
    })
    .sort(
      (a, b) => FRESHNESS_ORDER[a.state] - FRESHNESS_ORDER[b.state] || (a.days ?? 99_999) - (b.days ?? 99_999),
    );
}

// ————————————————————————— allergen position —————————————————————————
//
// What an auditor actually asks for: everything held, what is in it, and
// whether the paperwork behind the claim is current. Answered from the
// register rather than from memory.

export type AllergenPosition = {
  material: Material;
  present: Allergen[];
  declarationOnFile: boolean;
  declarationReviewed?: string;
};

export function allergenPosition(movements: Movement[]): AllergenPosition[] {
  const held = new Set(balances(movements).map((b) => b.materialCode));
  return MATERIALS.filter((m) => held.has(m.code))
    .map((m) => ({
      material: m,
      present: m.allergens,
      declarationOnFile: m.declarationOnFile,
      declarationReviewed: m.declarationReviewed,
    }))
    .sort(
      (a, b) =>
        Number(a.declarationOnFile) - Number(b.declarationOnFile) ||
        a.material.name.localeCompare(b.material.name),
    );
}

// Materials held in stock with no supplier declaration behind them. Not a
// crisis, but it is the gap an auditor finds, so it is stated plainly
// rather than left to be discovered.
export function declarationGaps(movements: Movement[]): Material[] {
  return allergenPosition(movements)
    .filter((a) => !a.declarationOnFile)
    .map((a) => a.material);
}

// ————————————————————————— storage check —————————————————————————

export type StorageIssue = {
  balance: LotBalance;
  material: Material;
  location: StockLocation;
  reason: string;
};

// Stock sitting somewhere that cannot hold its regime. Worth checking
// even once bookings are validated, because a location's use can change
// after stock was put into it.
export function misplaced(movements: Movement[]): StorageIssue[] {
  const out: StorageIssue[] = [];
  for (const b of balances(movements)) {
    if (!b.material || !b.location) continue;
    if (b.location.holding) continue;
    if (regimeFits(b.material.regime, b.location)) continue;
    out.push({
      balance: b,
      material: b.material,
      location: b.location,
      reason: `${b.material.name} is ${REGIME_LABEL[b.material.regime].toLowerCase()} (${REGIME_SPEC[b.material.regime]}) and ${b.location.name} cannot hold that.`,
    });
  }
  return out;
}

// Where a material may legitimately be booked.
export function locationsFor(material: Material): StockLocation[] {
  return LOCATIONS.filter((l) => regimeFits(material.regime, l));
}

// ————————————————————————— groupings —————————————————————————

export type Grouped = { key: string; label: string; items: LotBalance[] };

export function groupBalances(
  movements: Movement[],
  by: "category" | "regime" | "location" | "line",
): Grouped[] {
  const map = new Map<string, { label: string; sort: number; items: LotBalance[] }>();

  const REGIME_SORT: Record<Regime, number> = { ambient: 0, chilled: 1, frozen: 2, conditioned: 3 };

  for (const b of balances(movements)) {
    let key = "other";
    let label = "Other";
    let sort = 99;

    if (by === "category" && b.material) {
      key = b.material.category;
      label = CATEGORY_LABEL[b.material.category];
    } else if (by === "regime" && b.material) {
      key = b.material.regime;
      label = `${REGIME_LABEL[b.material.regime]} · ${REGIME_SPEC[b.material.regime]}`;
      sort = REGIME_SORT[b.material.regime];
    } else if (by === "location" && b.location) {
      key = b.location.id;
      label = `${b.location.name} · ${b.location.site}`;
    } else if (by === "line" && b.material) {
      key = b.material.line ?? "both";
      label = key === "both" ? "Used by both lines" : key === "ice cream" ? "Ice cream" : "Chocolate";
    }

    const g = map.get(key);
    if (g) g.items.push(b);
    else map.set(key, { label, sort, items: [b] });
  }

  return [...map.entries()]
    .map(([key, v]) => ({ key, label: v.label, sort: v.sort, items: v.items }))
    .sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label))
    .map(({ key, label, items }) => ({ key, label, items }));
}

// ————————————————————————— search —————————————————————————
//
// One box over the whole register and everything held. It searches the
// same alias list goods-in matches against, so a supplier's word for a
// material finds it here too — "cacao" reaches the cocoa beans without
// anyone having to know the register's own name for them.
//
// The useful part is the answer when nothing matches. "Chocolate powder"
// is not on this register: they hold beans and couverture. Saying so, and
// saying what near it *is* held, beats an empty list — and distinguishing
// "not on the register" from "on the register but none in stock" is the
// difference between a purchasing question and a stocktaking one.

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9%\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

// How well a material answers a query. Zero means no.
export function scoreMaterial(m: Material, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  const name = m.name.toLowerCase();
  if (m.code.toLowerCase() === q) return 100;
  if (name === q) return 95;
  if (name.includes(q)) return 80;
  if (m.aliases.some((a) => a === q)) return 78;
  if (m.aliases.some((a) => a.includes(q) || q.includes(a))) return 65;

  // The product line is matched whole, never as a substring. "Ice cream"
  // contains "cream", so a substring match there put catering tubs and
  // glucose syrup in the results for someone searching for cream.
  if (m.line && m.line.toLowerCase() === q) return 60;

  const haystack = [
    name,
    m.code,
    ...m.aliases,
    CATEGORY_LABEL[m.category],
    KIND_LABEL[m.kind],
    REGIME_LABEL[m.regime],
    m.supplier ?? "",
    m.origin ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (haystack.includes(q)) return 55;

  // Token overlap, which is what makes a two-word query like "chocolate
  // powder" land on the chocolate they do hold rather than nothing.
  const qt = tokens(q);
  const ht = new Set(tokens(haystack));
  const hits = qt.filter((t) => t.length > 2 && ht.has(t)).length;
  if (hits === 0) return 0;
  return 20 + (hits / qt.length) * 25;
}

// Searching for something the site excludes deserves a better answer than
// an empty list. "Nut" is not a gap in the register — it is the claim the
// business is built on, and the search should say so.
export function freeFromAnswer(query: string): string | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  const groups: { words: string[]; group: string }[] = [
    { words: ["nut", "nuts", "peanut", "hazelnut", "almond", "cashew", "pistachio", "walnut", "pecan", "praline", "marzipan"], group: "nut" },
    { words: ["gluten", "wheat", "barley", "rye", "spelt", "semolina"], group: "gluten" },
    { words: ["egg", "eggs", "albumen"], group: "egg" },
    { words: ["soya", "soy", "soybean", "lecithin"], group: "soya" },
    { words: ["palm", "palm oil", "palm fat", "palm kernel"], group: "palm oil" },
  ];

  const qt = tokens(q);
  for (const g of groups) {
    if (qt.some((t) => g.words.includes(t))) {
      return `The site is ${g.group} free. Nothing containing ${g.group} is held, and goods-in will stop it at the door — this is one of the claims every trade questionnaire answer rests on.`;
    }
  }
  return null;
}

function scoreBalance(b: LotBalance, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  // A lot code is how a recall starts, so an exact one wins outright.
  if (b.lot.toLowerCase() === q) return 100;
  if (b.lot.toLowerCase().includes(q)) return 85;
  if (b.location && b.location.name.toLowerCase().includes(q)) return 60;
  if (b.location && b.location.site.toLowerCase().includes(q)) return 50;

  return b.material ? scoreMaterial(b.material, query) : 0;
}

export type SearchResult = {
  matches: LotBalance[];
  // Set when the query names something the whole site is free from.
  freeFrom?: string;
  // On the register, matched the query, but none is currently in stock.
  onRegisterNotHeld: Material[];
  // Nothing matched at all — the nearest things on the register, so the
  // answer is a direction rather than a dead end.
  suggestions: Material[];
};

export function searchStock(movements: Movement[], query: string): SearchResult {
  const q = query.trim();
  if (!q) return { matches: balances(movements), onRegisterNotHeld: [], suggestions: [] };

  const scored = balances(movements)
    .map((b) => ({ b, score: scoreBalance(b, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const matches = scored.map((x) => x.b);
  const heldCodes = new Set(matches.map((m) => m.materialCode));

  const registerHits = MATERIALS.map((m) => ({ m, score: scoreMaterial(m, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const onRegisterNotHeld = registerHits.filter((x) => !heldCodes.has(x.m.code)).map((x) => x.m);

  // Only worth suggesting when the search found nothing anywhere.
  const suggestions =
    matches.length === 0 && onRegisterNotHeld.length === 0
      ? MATERIALS.map((m) => ({ m, score: looseScore(m, q) }))
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map((x) => x.m)
      : [];

  return { matches, onRegisterNotHeld, suggestions, freeFrom: freeFromAnswer(q) ?? undefined };
}

// Deliberately generous, and used only once a normal search has failed —
// a rough pointer is more use than nothing when someone has typed a word
// this business does not use.
function looseScore(m: Material, query: string): number {
  const qt = tokens(query);
  const ht = new Set(tokens([m.name, ...m.aliases, CATEGORY_LABEL[m.category]].join(" ")));
  let hits = 0;
  for (const t of qt) {
    if (t.length < 3) continue;
    for (const h of ht) {
      if (h.startsWith(t.slice(0, 4)) || t.startsWith(h.slice(0, 4))) {
        hits += 1;
        break;
      }
    }
  }
  return hits;
}
