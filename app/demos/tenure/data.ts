// ─────────────────────────────────────────────────────────────
// Tenure — sample data for the property management demo.
//
// A fictional South Devon managing agent, "Harbourside Property",
// running a mixed portfolio of long lets and a few holiday lets across
// Salcombe, Dartmouth, Kingsbridge, Totnes and Modbury. Deliberately the
// shape of a real South Devon agency without being any actual one, since
// this sits on the public site behind a gate.
//
// Everything is static. No database, no API — the demo is a picture of
// the working week, not a running system.
// ─────────────────────────────────────────────────────────────

/** The demo's "today". Fixed so the urgency states never drift. */
export const TODAY = new Date("2026-09-01T09:00:00Z");

export function daysUntil(iso: string): number {
  const then = new Date(`${iso}T00:00:00Z`).getTime();
  return Math.round((then - TODAY.getTime()) / 86_400_000);
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** How a dated obligation reads: overdue, close, or fine. */
export type Urgency = "overdue" | "soon" | "clear";

export function urgencyOf(iso: string, soonWithin = 30): Urgency {
  const d = daysUntil(iso);
  if (d < 0) return "overdue";
  if (d <= soonWithin) return "soon";
  return "clear";
}

export function relativeDays(iso: string): string {
  const d = daysUntil(iso);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d === -1) return "1 day ago";
  if (d < 0) return `${Math.abs(d)} days ago`;
  return `in ${d} days`;
}

// ─────────────── PORTFOLIO ───────────────

export type Property = {
  id: string;
  address: string;
  town: string;
  postcode: string;
  type: "House" | "Flat" | "Cottage" | "Maisonette";
  beds: number;
  tenure: "Long let" | "Holiday let" | "Vacant";
  landlord: string;
  manager: string;
};

export const properties: Property[] = [
  {
    id: "p-001",
    address: "12 Fore Street",
    town: "Salcombe",
    postcode: "TQ8 8BU",
    type: "Flat",
    beds: 2,
    tenure: "Long let",
    landlord: "M. Fenwick",
    manager: "Nia Trelawny",
  },
  {
    id: "p-002",
    address: "4 Coronation Road",
    town: "Salcombe",
    postcode: "TQ8 8BZ",
    type: "House",
    beds: 3,
    tenure: "Long let",
    landlord: "Bayfield Estates Ltd",
    manager: "Nia Trelawny",
  },
  {
    id: "p-003",
    address: "27 Victoria Road",
    town: "Dartmouth",
    postcode: "TQ6 9SA",
    type: "Maisonette",
    beds: 2,
    tenure: "Long let",
    landlord: "R. & J. Ashcombe",
    manager: "Tom Wills",
  },
  {
    id: "p-004",
    address: "9 Above Town",
    town: "Dartmouth",
    postcode: "TQ6 9RG",
    type: "Cottage",
    beds: 2,
    tenure: "Holiday let",
    landlord: "R. & J. Ashcombe",
    manager: "Tom Wills",
  },
  {
    id: "p-005",
    address: "63 Fore Street",
    town: "Kingsbridge",
    postcode: "TQ7 1PG",
    type: "Flat",
    beds: 1,
    tenure: "Long let",
    landlord: "M. Fenwick",
    manager: "Nia Trelawny",
  },
  {
    id: "p-006",
    address: "2 Duncombe Park",
    town: "Kingsbridge",
    postcode: "TQ7 1JX",
    type: "House",
    beds: 4,
    tenure: "Long let",
    landlord: "Halwell Property Co",
    manager: "Tom Wills",
  },
  {
    id: "p-007",
    address: "18 Bridgetown",
    town: "Totnes",
    postcode: "TQ9 5AD",
    type: "House",
    beds: 3,
    tenure: "Long let",
    landlord: "Halwell Property Co",
    manager: "Priya Sandhu",
  },
  {
    id: "p-008",
    address: "5 Leechwell Street",
    town: "Totnes",
    postcode: "TQ9 5SX",
    type: "Cottage",
    beds: 2,
    tenure: "Vacant",
    landlord: "Bayfield Estates Ltd",
    manager: "Priya Sandhu",
  },
  {
    id: "p-009",
    address: "31 Church Street",
    town: "Modbury",
    postcode: "PL21 0QR",
    type: "House",
    beds: 3,
    tenure: "Long let",
    landlord: "S. Pearce",
    manager: "Priya Sandhu",
  },
];

export const propertyById = (id: string) =>
  properties.find((p) => p.id === id);

/** Short label used everywhere a property is referenced. */
export const propertyLabel = (id: string) => {
  const p = propertyById(id);
  return p ? `${p.address}, ${p.town}` : id;
};

// ─────────────── TENANCIES ───────────────

export type Tenancy = {
  id: string;
  propertyId: string;
  tenant: string;
  start: string;
  end: string;
  /** Monthly rent in pounds. */
  rent: number;
  rentDay: number;
  status: "Periodic" | "Fixed term" | "Ending" | "Notice served";
  arrears: number;
  depositScheme: "TDS" | "DPS" | "mydeposits";
  depositProtectedOn: string;
};

export const tenancies: Tenancy[] = [
  {
    id: "t-001",
    propertyId: "p-001",
    tenant: "H. Okonkwo",
    start: "2024-10-01",
    end: "2026-09-30",
    rent: 1150,
    rentDay: 1,
    status: "Fixed term",
    arrears: 0,
    depositScheme: "TDS",
    depositProtectedOn: "2024-10-08",
  },
  {
    id: "t-002",
    propertyId: "p-002",
    tenant: "The Whitcombe family",
    start: "2023-06-15",
    end: "2026-09-14",
    rent: 1650,
    rentDay: 15,
    status: "Ending",
    arrears: 0,
    depositScheme: "DPS",
    depositProtectedOn: "2023-06-20",
  },
  {
    id: "t-003",
    propertyId: "p-003",
    tenant: "L. Barrow",
    start: "2025-02-01",
    end: "2027-01-31",
    rent: 995,
    rentDay: 1,
    status: "Fixed term",
    arrears: 995,
    depositScheme: "TDS",
    depositProtectedOn: "2025-02-05",
  },
  {
    id: "t-004",
    propertyId: "p-005",
    tenant: "C. Delaney",
    start: "2022-04-01",
    end: "2026-10-31",
    rent: 795,
    rentDay: 1,
    status: "Periodic",
    arrears: 0,
    depositScheme: "mydeposits",
    depositProtectedOn: "2022-04-11",
  },
  {
    id: "t-005",
    propertyId: "p-006",
    tenant: "K. & A. Mensah",
    start: "2025-09-01",
    end: "2027-08-31",
    rent: 1875,
    rentDay: 1,
    status: "Fixed term",
    arrears: 0,
    depositScheme: "DPS",
    depositProtectedOn: "2025-09-04",
  },
  {
    id: "t-006",
    propertyId: "p-007",
    tenant: "J. Rowe",
    start: "2024-03-01",
    end: "2026-09-08",
    rent: 1425,
    rentDay: 1,
    status: "Notice served",
    arrears: 2850,
    depositScheme: "TDS",
    depositProtectedOn: "2024-03-06",
  },
  {
    id: "t-007",
    propertyId: "p-009",
    tenant: "D. Stanbury",
    start: "2025-11-01",
    end: "2026-10-31",
    rent: 1250,
    rentDay: 1,
    status: "Fixed term",
    arrears: 0,
    depositScheme: "DPS",
    depositProtectedOn: "2025-11-07",
  },
];

export const tenancyForProperty = (propertyId: string) =>
  tenancies.find((t) => t.propertyId === propertyId);

// ─────────────── MAINTENANCE ───────────────

export type Job = {
  id: string;
  ref: string;
  propertyId: string;
  summary: string;
  raised: string;
  reportedBy: "Tenant" | "Landlord" | "Inspection" | "Contractor";
  priority: "Emergency" | "Urgent" | "Routine";
  status: "New" | "Quoting" | "Booked" | "In progress" | "Awaiting invoice";
  contractor: string | null;
  /** Set when the job has a date the tenant has been promised. */
  scheduled: string | null;
};

export const jobs: Job[] = [
  {
    id: "j-001",
    ref: "MNT-2841",
    propertyId: "p-003",
    summary: "No hot water — combi boiler locking out on ignition",
    raised: "2026-08-31",
    reportedBy: "Tenant",
    priority: "Emergency",
    status: "Booked",
    contractor: "Dart Valley Heating",
    scheduled: "2026-09-01",
  },
  {
    id: "j-002",
    ref: "MNT-2838",
    propertyId: "p-007",
    summary: "Damp patch spreading on north bedroom wall",
    raised: "2026-08-24",
    reportedBy: "Tenant",
    priority: "Urgent",
    status: "Quoting",
    contractor: null,
    scheduled: null,
  },
  {
    id: "j-003",
    ref: "MNT-2836",
    propertyId: "p-002",
    summary: "Gutter blocked at rear, overflowing onto porch",
    raised: "2026-08-21",
    reportedBy: "Inspection",
    priority: "Routine",
    status: "Booked",
    contractor: "Salcombe Property Services",
    scheduled: "2026-09-04",
  },
  {
    id: "j-004",
    ref: "MNT-2833",
    propertyId: "p-006",
    summary: "Replace worn stair carpet, first flight",
    raised: "2026-08-18",
    reportedBy: "Landlord",
    priority: "Routine",
    status: "Awaiting invoice",
    contractor: "Kingsbridge Flooring",
    scheduled: "2026-08-27",
  },
  {
    id: "j-005",
    ref: "MNT-2829",
    propertyId: "p-001",
    summary: "Window catch broken, front elevation — security concern",
    raised: "2026-08-12",
    reportedBy: "Tenant",
    priority: "Urgent",
    status: "In progress",
    contractor: "Estuary Joinery",
    scheduled: "2026-09-02",
  },
  {
    id: "j-006",
    ref: "MNT-2827",
    propertyId: "p-008",
    summary: "Full redecoration ahead of re-let",
    raised: "2026-08-10",
    reportedBy: "Landlord",
    priority: "Routine",
    status: "In progress",
    contractor: "Totnes Decorating Co",
    scheduled: "2026-09-07",
  },
];

// ─────────────── COMPLIANCE ───────────────

export type Certificate = {
  id: string;
  propertyId: string;
  kind:
    | "Gas safety"
    | "EICR"
    | "EPC"
    | "Legionella assessment"
    | "PAT test"
    | "Fire alarm service";
  issued: string;
  expires: string;
  provider: string;
  /** Where the obligation comes from, shown as a plain-English note. */
  basis: string;
};

export const certificates: Certificate[] = [
  {
    id: "c-001",
    propertyId: "p-003",
    kind: "Gas safety",
    issued: "2025-08-14",
    expires: "2026-08-14",
    provider: "Dart Valley Heating",
    basis: "Annual. Renewal must be arranged before expiry, not after.",
  },
  {
    id: "c-002",
    propertyId: "p-007",
    kind: "Gas safety",
    issued: "2025-09-09",
    expires: "2026-09-09",
    provider: "Dart Valley Heating",
    basis: "Annual. Renewal must be arranged before expiry, not after.",
  },
  {
    id: "c-003",
    propertyId: "p-001",
    kind: "Gas safety",
    issued: "2025-09-22",
    expires: "2026-09-22",
    provider: "Salcombe Property Services",
    basis: "Annual. Renewal must be arranged before expiry, not after.",
  },
  {
    id: "c-004",
    propertyId: "p-002",
    kind: "EICR",
    issued: "2021-11-30",
    expires: "2026-11-30",
    provider: "Ashburton Electrical",
    basis: "Five-yearly for rented homes, or sooner if the report says so.",
  },
  {
    id: "c-005",
    propertyId: "p-006",
    kind: "EICR",
    issued: "2022-05-19",
    expires: "2027-05-19",
    provider: "Ashburton Electrical",
    basis: "Five-yearly for rented homes, or sooner if the report says so.",
  },
  {
    id: "c-006",
    propertyId: "p-005",
    kind: "EPC",
    issued: "2016-08-30",
    expires: "2026-08-30",
    provider: "South Hams Energy Assessors",
    basis: "Ten-yearly. A new let cannot be marketed without a valid one.",
  },
  {
    id: "c-007",
    propertyId: "p-008",
    kind: "EPC",
    issued: "2017-03-15",
    expires: "2027-03-15",
    provider: "South Hams Energy Assessors",
    basis: "Ten-yearly. A new let cannot be marketed without a valid one.",
  },
  {
    id: "c-008",
    propertyId: "p-009",
    kind: "Gas safety",
    issued: "2025-10-30",
    expires: "2026-10-30",
    provider: "Modbury Plumbing",
    basis: "Annual. Renewal must be arranged before expiry, not after.",
  },
  {
    id: "c-009",
    propertyId: "p-004",
    kind: "Fire alarm service",
    issued: "2026-02-11",
    expires: "2027-02-11",
    provider: "Westcountry Fire Safety",
    basis: "Annual service on the holiday let's linked alarm system.",
  },
  {
    id: "c-010",
    propertyId: "p-004",
    kind: "PAT test",
    issued: "2025-09-05",
    expires: "2026-09-05",
    provider: "Westcountry Fire Safety",
    basis: "Annual on the holiday let's supplied appliances.",
  },
  {
    id: "c-011",
    propertyId: "p-006",
    kind: "Legionella assessment",
    issued: "2024-04-02",
    expires: "2026-09-16",
    provider: "Harbourside (in-house)",
    basis: "Reviewed every two years, or when the water system changes.",
  },
];

// ─────────────── THE MORNING LIST ───────────────

export type Exception = {
  id: string;
  headline: string;
  detail: string;
  propertyId: string;
  /** Which section answers it — used to drive the jump link. */
  section: "tenancies" | "maintenance" | "compliance";
  urgency: Urgency;
  /** The date the exception is pinned to. */
  date: string;
};

/** Built by hand rather than derived, so the demo reads in a deliberate order. */
export const exceptions: Exception[] = [
  {
    id: "e-001",
    headline: "Gas safety certificate has expired",
    detail:
      "27 Victoria Road has been let for 18 days without a valid certificate. The boiler engineer is on site today for a separate fault — the renewal can be added to that visit.",
    propertyId: "p-003",
    section: "compliance",
    urgency: "overdue",
    date: "2026-08-14",
  },
  {
    id: "e-002",
    headline: "EPC expired on a property about to be re-marketed",
    detail:
      "63 Fore Street's certificate ran out yesterday. The tenancy is periodic, so nothing is unlawful today, but it cannot be advertised again until a new assessment is done.",
    propertyId: "p-005",
    section: "compliance",
    urgency: "overdue",
    date: "2026-08-30",
  },
  {
    id: "e-003",
    headline: "Rent arrears past two months",
    detail:
      "18 Bridgetown is £2,850 behind and notice has been served. The expiry falls next week, so the decision on what happens next is due now.",
    propertyId: "p-007",
    section: "tenancies",
    urgency: "overdue",
    date: "2026-09-08",
  },
  {
    id: "e-004",
    headline: "Emergency job booked for today",
    detail:
      "No hot water at 27 Victoria Road since Sunday. Dart Valley Heating are attending this morning — the tenant has been told before noon.",
    propertyId: "p-003",
    section: "maintenance",
    urgency: "soon",
    date: "2026-09-01",
  },
  {
    id: "e-005",
    headline: "Tenancy ends in under two weeks",
    detail:
      "4 Coronation Road reaches the end of its fixed term on 14 September and no renewal has been agreed. The landlord has not yet said whether they want to re-let.",
    propertyId: "p-002",
    section: "tenancies",
    urgency: "soon",
    date: "2026-09-14",
  },
  {
    id: "e-006",
    headline: "Gas safety certificate due within the week",
    detail:
      "18 Bridgetown expires on 9 September. Given the arrears position, access may be the harder problem than the booking.",
    propertyId: "p-007",
    section: "compliance",
    urgency: "soon",
    date: "2026-09-09",
  },
];

// ─────────────── HEADLINE FIGURES ───────────────

export const portfolioSummary = {
  managed: properties.length,
  occupied: tenancies.length,
  vacant: properties.filter((p) => p.tenure === "Vacant").length,
  monthlyRent: tenancies.reduce((sum, t) => sum + t.rent, 0),
  arrears: tenancies.reduce((sum, t) => sum + t.arrears, 0),
  openJobs: jobs.length,
};

export const money = (n: number) =>
  n.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  });
