// Sample data for the Provenance demonstration environment.
// Fictional producer: Estuary Creamery — small-batch ice cream and
// bean-to-bar chocolate, one factory, own shops, wholesale trade.
// Everything here is invented; nothing identifies a real business.

export type Status = "ok" | "due" | "overdue";

export const QUESTIONNAIRES = [
  {
    id: "SPQ-0341",
    from: "Harbourline Hotels Group",
    received: "21 Jul 2026",
    questions: 64,
    drafted: 61,
    state: "Ready for review",
    open: true,
  },
  { id: "SPQ-0339", from: "Westcott Farm Shops", received: "17 Jul 2026", questions: 38, drafted: 38, state: "Sent", open: false },
  { id: "SPQ-0336", from: "The Anchor & Hope, Dartmouth", received: "11 Jul 2026", questions: 22, drafted: 22, state: "Sent", open: false },
];

export const DRAFT_ANSWERS = [
  {
    q: "3.1 — Does the site operate a documented HACCP plan?",
    a: "Yes. A full HACCP study is documented and maintained, most recently reviewed 4 March 2026. Critical control points cover pasteurisation, freezing, and metal detection at pack-off.",
    source: "HACCP Study v11 · §2",
    confidence: "High",
  },
  {
    q: "3.4 — Is the site free from nut handling?",
    a: "Yes. The entire site is nut free. No nut ingredients are purchased, stored, or handled anywhere in the factory. Supplier declarations are held for all raw materials confirming absence of nut cross-contact.",
    source: "Allergen Policy v7 · §1.2",
    confidence: "High",
  },
  {
    q: "5.2 — State pasteurisation time and temperature parameters.",
    a: "Mix is pasteurised at 85°C with a 15-second hold, verified by continuous chart recorder. Divert valve operation is tested at the start of each production day.",
    source: "Process Spec PS-04 · §3.1",
    confidence: "High",
  },
  {
    q: "7.3 — Provide details of your environmental swabbing programme.",
    a: "Weekly swabs are taken from six zoned sites across the production area and tested for Listeria spp. by a UKAS-accredited laboratory.",
    source: "Micro Schedule 2026 · §4",
    confidence: "Review",
    note: "Schedule shows five sites since April — confirm current count before sending.",
  },
];

export const DOCUMENTS = [
  { name: "HACCP Study", ref: "QMS-01", version: "v11", reviewed: "04 Mar 2026", next: "04 Mar 2027", status: "ok" as Status },
  { name: "Allergen Policy", ref: "QMS-04", version: "v7", reviewed: "12 Jan 2026", next: "12 Jan 2027", status: "ok" as Status },
  { name: "Supplier Declaration — Cocoa (Lot importer)", ref: "SUP-11", version: "v3", reviewed: "30 Aug 2025", next: "30 Aug 2026", status: "due" as Status },
  { name: "Supplier Declaration — Dairy (Home Farm)", ref: "SUP-02", version: "v9", reviewed: "02 Jul 2026", next: "02 Jul 2027", status: "ok" as Status },
  { name: "Glass & Brittle Plastic Register", ref: "QMS-09", version: "v5", reviewed: "19 May 2025", next: "19 May 2026", status: "overdue" as Status },
  { name: "Pest Control Contract & Reports", ref: "EXT-03", version: "—", reviewed: "01 Jul 2026", next: "01 Oct 2026", status: "ok" as Status },
];

export const TRAINING = [
  { person: "M. Reeve", role: "Production", cert: "Level 2 Food Hygiene", expires: "14 Sep 2026", status: "due" as Status },
  { person: "J. Okafor", role: "Production", cert: "Level 2 Food Hygiene", expires: "02 Feb 2027", status: "ok" as Status },
  { person: "S. Trent", role: "Shop — Quay", cert: "Allergen Awareness", expires: "28 Jun 2026", status: "overdue" as Status },
  { person: "A. Voss", role: "Quality", cert: "HACCP Level 3", expires: "11 Nov 2027", status: "ok" as Status },
];

// One batch traced both directions.
export const TRACE = {
  batch: "IC-2607-14",
  product: "Salted Caramel — 2L catering",
  made: "07 Jul 2026",
  quantity: "412 units",
  inputs: [
    { material: "Whole milk", lot: "HF-070726", supplier: "Home Farm" },
    { material: "Double cream", lot: "HF-070726-C", supplier: "Home Farm" },
    { material: "Caramel (own-made)", lot: "CB-2606-03", supplier: "In-house" },
    { material: "Sugar", lot: "BS-9911-K", supplier: "British Sugar" },
  ],
  dispatched: [
    { to: "Harbourline Hotels — Salcombe", date: "09 Jul 2026", units: 96 },
    { to: "Own shop — Island Street", date: "09 Jul 2026", units: 120 },
    { to: "Own shop — Bath", date: "11 Jul 2026", units: 84 },
    { to: "Westcott Farm Shops (via distributor)", date: "12 Jul 2026", units: 112 },
  ],
};

export const PRODUCTION_LOG = [
  { time: "06:42", entry: "Pasteuriser divert valve test — pass", who: "M. Reeve", via: "voice", kind: "ccp" },
  { time: "07:15", entry: "Mix batch IC-2607-22 started · 780L vanilla base", who: "M. Reeve", via: "voice", kind: "batch" },
  { time: "08:03", entry: "Pasteurisation IC-2607-22 · 85.4°C · 15s hold — pass", who: "chart recorder", via: "auto", kind: "ccp" },
  { time: "09:30", entry: "Metal detection line check · Fe 1.5mm / NonFe 2.0mm / SS 2.5mm — pass", who: "J. Okafor", via: "voice", kind: "ccp" },
  { time: "10:12", entry: "Allergen changeover clean, line 2 — verified", who: "A. Voss", via: "voice", kind: "clean" },
  { time: "11:47", entry: "Freezer draw temp IC-2607-22 · −5.8°C — in spec", who: "M. Reeve", via: "voice", kind: "check" },
];

export const COLD_CHAIN = [
  { asset: "Van 1 — South Hams round", now: "−19.4°C", state: "ok" as Status, note: "On round · 6 drops remaining" },
  { asset: "Van 2 — Bristol / Bath", now: "−14.1°C", state: "due" as Status, note: "Door-open spike 11:38 · recovering" },
  { asset: "Coldstore A (factory)", now: "−22.6°C", state: "ok" as Status, note: "Steady" },
  { asset: "Shop freezer — Pulteney Bridge", now: "−18.9°C", state: "ok" as Status, note: "Steady" },
  { asset: "Shop freezer — Strete Gate", now: "−11.2°C", state: "overdue" as Status, note: "Above −15°C for 22 min · alert sent 12:04" },
];
