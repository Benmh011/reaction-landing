// ─────────────────────────────────────────────────────────────
// Tenure — data bank for the property management demo.
//
// A fictional South Devon / East Cornwall managing agent looking after
// holiday lets and private second homes. Everything here is invented:
// owners, guests, staff and trades are all made up, and the house names
// are not real properties.
//
// The shape is deliberately the shape of the spreadsheets this replaces:
// a changeover grid, a housekeeper rota, a linen requirement sheet, a
// compliance matrix, and a monthly owner statement run.
// ─────────────────────────────────────────────────────────────

/** The demo's "today" — fixed so urgency states never drift. */
export const TODAY = "2026-09-01"; // Tuesday

/** The changeover week the office is currently planning. */
export const WEEK = [
  "2026-09-05", // Sat — the big changeover day
  "2026-09-06",
  "2026-09-07",
  "2026-09-08",
  "2026-09-09",
  "2026-09-10",
  "2026-09-11",
];

export const PEAK_DAY = "2026-09-05";

// ─────────────── DATE HELPERS ───────────────

const ms = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();

export function daysUntil(iso: string): number {
  return Math.round((ms(iso) - ms(TODAY)) / 86_400_000);
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function weekday(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    timeZone: "UTC",
  });
}

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

export const money = (n: number) =>
  n.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  });

// ─────────────── OWNERS ───────────────

export type Owner = {
  id: string;
  name: string;
  based: string;
  feePercent: number;
  markupPercent: number;
  bookkeeper: string;
  statementEmail: string;
};

export const owners: Owner[] = [
  { id: "o-01", name: "M. & C. Fenwick", based: "Wandsworth, London", feePercent: 18, markupPercent: 12, bookkeeper: "Ruth Vardy", statementEmail: "fenwick.holidayhome@example.com" },
  { id: "o-02", name: "Bayfield Estates Ltd", based: "Bristol", feePercent: 15, markupPercent: 10, bookkeeper: "Ruth Vardy", statementEmail: "accounts@bayfieldestates.example.com" },
  { id: "o-03", name: "R. & J. Ashcombe", based: "Winchester", feePercent: 18, markupPercent: 12, bookkeeper: "Ruth Vardy", statementEmail: "ashcombe.family@example.com" },
  { id: "o-04", name: "S. Pearce", based: "Guildford", feePercent: 20, markupPercent: 12, bookkeeper: "Del Hannaford", statementEmail: "s.pearce@example.com" },
  { id: "o-05", name: "The Kestrel Trust", based: "Exeter", feePercent: 15, markupPercent: 10, bookkeeper: "Del Hannaford", statementEmail: "trustees@kestreltrust.example.com" },
  { id: "o-06", name: "N. Okonkwo", based: "Hampstead, London", feePercent: 18, markupPercent: 12, bookkeeper: "Del Hannaford", statementEmail: "n.okonkwo@example.com" },
  { id: "o-07", name: "A. & P. Whitcombe", based: "Bath", feePercent: 18, markupPercent: 12, bookkeeper: "Ruth Vardy", statementEmail: "whitcombe.house@example.com" },
  { id: "o-08", name: "Halwell Property Co", based: "Newton Abbot", feePercent: 12, markupPercent: 8, bookkeeper: "Del Hannaford", statementEmail: "finance@halwellproperty.example.com" },
  { id: "o-09", name: "L. Trevaskis", based: "Truro", feePercent: 20, markupPercent: 12, bookkeeper: "Del Hannaford", statementEmail: "l.trevaskis@example.com" },
  { id: "o-10", name: "D. & H. Marchetti", based: "Zurich", feePercent: 20, markupPercent: 15, bookkeeper: "Ruth Vardy", statementEmail: "marchetti.devon@example.com" },
];

export const ownerById = (id: string) => owners.find((o) => o.id === id);

// ─────────────── PROPERTIES ───────────────

export type Property = {
  id: string;
  name: string;
  village: string;
  branch: "Salcombe" | "Downderry";
  use: "Holiday let" | "Private";
  ownerId: string;
  manager: string;
  sleeps: number;
  beds: { king: number; double: number; twin: number; single: number; sofa: number };
  bathrooms: number;
  hotTub: boolean;
  gas: boolean;
  cleanHours: number;
  driveMinutes: number;
};

export const properties: Property[] = [
  { id: "p-01", name: "The Boathouse", village: "Salcombe", branch: "Salcombe", use: "Holiday let", ownerId: "o-01", manager: "Nia Trelawny", sleeps: 8, beds: { king: 2, double: 1, twin: 1, single: 0, sofa: 1 }, bathrooms: 3, hotTub: true, gas: true, cleanHours: 6, driveMinutes: 4 },
  { id: "p-02", name: "Gull Rock", village: "Hope Cove", branch: "Salcombe", use: "Holiday let", ownerId: "o-02", manager: "Nia Trelawny", sleeps: 6, beds: { king: 1, double: 1, twin: 1, single: 0, sofa: 0 }, bathrooms: 2, hotTub: false, gas: true, cleanHours: 4.5, driveMinutes: 18 },
  { id: "p-03", name: "Sea Thrift", village: "Thurlestone", branch: "Salcombe", use: "Holiday let", ownerId: "o-03", manager: "Tom Wills", sleeps: 4, beds: { king: 1, double: 0, twin: 1, single: 0, sofa: 0 }, bathrooms: 2, hotTub: false, gas: false, cleanHours: 3.5, driveMinutes: 22 },
  { id: "p-04", name: "Harbour Light", village: "Salcombe", branch: "Salcombe", use: "Holiday let", ownerId: "o-03", manager: "Tom Wills", sleeps: 10, beds: { king: 2, double: 2, twin: 1, single: 0, sofa: 1 }, bathrooms: 4, hotTub: true, gas: true, cleanHours: 7.5, driveMinutes: 6 },
  { id: "p-05", name: "Whitesands", village: "Bantham", branch: "Salcombe", use: "Holiday let", ownerId: "o-04", manager: "Priya Sandhu", sleeps: 6, beds: { king: 1, double: 1, twin: 1, single: 0, sofa: 0 }, bathrooms: 2, hotTub: false, gas: true, cleanHours: 4.5, driveMinutes: 26 },
  { id: "p-06", name: "Cliff End", village: "East Portlemouth", branch: "Salcombe", use: "Private", ownerId: "o-05", manager: "Nia Trelawny", sleeps: 8, beds: { king: 2, double: 1, twin: 1, single: 0, sofa: 0 }, bathrooms: 3, hotTub: false, gas: true, cleanHours: 5, driveMinutes: 14 },
  { id: "p-07", name: "Tamarisk", village: "Newton Ferrers", branch: "Salcombe", use: "Holiday let", ownerId: "o-06", manager: "Priya Sandhu", sleeps: 6, beds: { king: 1, double: 2, twin: 0, single: 0, sofa: 0 }, bathrooms: 2, hotTub: false, gas: false, cleanHours: 4.5, driveMinutes: 34 },
  { id: "p-08", name: "The Lookout", village: "Noss Mayo", branch: "Salcombe", use: "Holiday let", ownerId: "o-07", manager: "Priya Sandhu", sleeps: 4, beds: { king: 1, double: 1, twin: 0, single: 0, sofa: 0 }, bathrooms: 2, hotTub: false, gas: true, cleanHours: 3.5, driveMinutes: 36 },
  { id: "p-09", name: "Puffin Cottage", village: "Bigbury-on-Sea", branch: "Salcombe", use: "Holiday let", ownerId: "o-08", manager: "Tom Wills", sleeps: 5, beds: { king: 1, double: 0, twin: 1, single: 1, sofa: 0 }, bathrooms: 2, hotTub: false, gas: true, cleanHours: 4, driveMinutes: 24 },
  { id: "p-10", name: "Salt House", village: "Torcross", branch: "Salcombe", use: "Holiday let", ownerId: "o-08", manager: "Tom Wills", sleeps: 8, beds: { king: 2, double: 1, twin: 1, single: 0, sofa: 1 }, bathrooms: 3, hotTub: true, gas: true, cleanHours: 6, driveMinutes: 28 },
  { id: "p-11", name: "Little Bay", village: "Cawsand", branch: "Downderry", use: "Holiday let", ownerId: "o-09", manager: "Owen Prisk", sleeps: 4, beds: { king: 1, double: 0, twin: 1, single: 0, sofa: 1 }, bathrooms: 1, hotTub: false, gas: true, cleanHours: 3.5, driveMinutes: 62 },
  { id: "p-12", name: "Rock Pool", village: "Downderry", branch: "Downderry", use: "Holiday let", ownerId: "o-09", manager: "Owen Prisk", sleeps: 6, beds: { king: 1, double: 1, twin: 1, single: 0, sofa: 0 }, bathrooms: 2, hotTub: false, gas: false, cleanHours: 4.5, driveMinutes: 68 },
  { id: "p-13", name: "Thornhill", village: "Slapton", branch: "Salcombe", use: "Private", ownerId: "o-10", manager: "Nia Trelawny", sleeps: 10, beds: { king: 3, double: 1, twin: 1, single: 0, sofa: 0 }, bathrooms: 4, hotTub: true, gas: true, cleanHours: 6.5, driveMinutes: 30 },
  { id: "p-14", name: "Kingfisher", village: "Kingsbridge", branch: "Salcombe", use: "Holiday let", ownerId: "o-02", manager: "Priya Sandhu", sleeps: 4, beds: { king: 1, double: 1, twin: 0, single: 0, sofa: 0 }, bathrooms: 1, hotTub: false, gas: true, cleanHours: 3, driveMinutes: 12 },
];

export const propertyById = (id: string) => properties.find((p) => p.id === id);
export const propertyName = (id: string) => propertyById(id)?.name ?? id;

export const propertyLabel = (id: string) => {
  const p = propertyById(id);
  return p ? `${p.name}, ${p.village}` : id;
};

// ─────────────── HOUSEKEEPERS ───────────────

export type Housekeeper = {
  id: string;
  name: string;
  role: "Housekeeper" | "Senior housekeeper" | "Cleaner";
  branch: "Salcombe" | "Downderry";
  contracted: number;
  basedIn: string;
  /** Properties they are signed off on. Empty means no restriction. */
  trainedOn: string[];
};

export const housekeepers: Housekeeper[] = [
  { id: "h-01", name: "Jo Pengelly", role: "Senior housekeeper", branch: "Salcombe", contracted: 37, basedIn: "Salcombe", trainedOn: [] },
  { id: "h-02", name: "Marta Kowal", role: "Housekeeper", branch: "Salcombe", contracted: 30, basedIn: "Kingsbridge", trainedOn: [] },
  { id: "h-03", name: "Sue Wakeham", role: "Housekeeper", branch: "Salcombe", contracted: 24, basedIn: "Hope Cove", trainedOn: [] },
  { id: "h-04", name: "Ellie Roskilly", role: "Housekeeper", branch: "Salcombe", contracted: 30, basedIn: "Salcombe", trainedOn: [] },
  { id: "h-05", name: "Dan Yeo", role: "Cleaner", branch: "Salcombe", contracted: 16, basedIn: "Modbury", trainedOn: ["p-05", "p-07", "p-08", "p-09"] },
  { id: "h-06", name: "Bea Southcott", role: "Housekeeper", branch: "Salcombe", contracted: 24, basedIn: "Thurlestone", trainedOn: [] },
  { id: "h-07", name: "Ana Ferreira", role: "Housekeeper", branch: "Salcombe", contracted: 30, basedIn: "Salcombe", trainedOn: [] },
  { id: "h-08", name: "Kim Tregear", role: "Cleaner", branch: "Salcombe", contracted: 12, basedIn: "Torcross", trainedOn: ["p-10", "p-13"] },
  { id: "h-09", name: "Lowen Trebilcock", role: "Senior housekeeper", branch: "Downderry", contracted: 37, basedIn: "Downderry", trainedOn: [] },
  { id: "h-10", name: "Carys Nance", role: "Housekeeper", branch: "Downderry", contracted: 20, basedIn: "Cawsand", trainedOn: [] },
];

export const housekeeperById = (id: string) =>
  housekeepers.find((h) => h.id === id);

export const absences: { housekeeperId: string; date: string; reason: string }[] = [
  { housekeeperId: "h-03", date: "2026-09-05", reason: "Annual leave" },
  { housekeeperId: "h-03", date: "2026-09-06", reason: "Annual leave" },
  { housekeeperId: "h-07", date: "2026-09-08", reason: "Annual leave" },
  { housekeeperId: "h-10", date: "2026-09-05", reason: "Unavailable" },
];

export const isAbsent = (housekeeperId: string, date: string) =>
  absences.some((a) => a.housekeeperId === housekeeperId && a.date === date);

// ─────────────── BOOKINGS ───────────────

export type Booking = {
  id: string;
  propertyId: string;
  guest: string;
  from: string;
  to: string;
  channel: "Airbnb" | "Sykes" | "HolidayHost" | "Direct" | "Owner";
  party: number;
  gross: number;
};

export const bookings: Booking[] = [
  { id: "b-01", propertyId: "p-01", guest: "Hargreaves", from: "2026-08-29", to: "2026-09-05", channel: "Sykes", party: 8, gross: 3850 },
  { id: "b-02", propertyId: "p-02", guest: "Nolan", from: "2026-08-29", to: "2026-09-05", channel: "Airbnb", party: 5, gross: 1980 },
  { id: "b-03", propertyId: "p-04", guest: "Devereux", from: "2026-08-29", to: "2026-09-05", channel: "Direct", party: 10, gross: 5400 },
  { id: "b-04", propertyId: "p-05", guest: "Ibbotson", from: "2026-08-29", to: "2026-09-05", channel: "Sykes", party: 6, gross: 2240 },
  { id: "b-05", propertyId: "p-09", guest: "Attwell", from: "2026-08-29", to: "2026-09-05", channel: "HolidayHost", party: 5, gross: 1620 },
  { id: "b-06", propertyId: "p-10", guest: "Brand", from: "2026-08-29", to: "2026-09-05", channel: "Sykes", party: 8, gross: 3100 },
  { id: "b-07", propertyId: "p-11", guest: "Kessell", from: "2026-08-29", to: "2026-09-05", channel: "Airbnb", party: 4, gross: 1180 },
  { id: "b-08", propertyId: "p-14", guest: "Osei", from: "2026-08-29", to: "2026-09-05", channel: "Airbnb", party: 4, gross: 1240 },

  { id: "b-09", propertyId: "p-01", guest: "Vasquez", from: "2026-09-05", to: "2026-09-12", channel: "Direct", party: 7, gross: 3600 },
  { id: "b-10", propertyId: "p-02", guest: "Framlington", from: "2026-09-05", to: "2026-09-12", channel: "Sykes", party: 6, gross: 1850 },
  { id: "b-11", propertyId: "p-04", guest: "Achebe", from: "2026-09-05", to: "2026-09-19", channel: "Direct", party: 9, gross: 9800 },
  { id: "b-12", propertyId: "p-09", guest: "Tremayne", from: "2026-09-05", to: "2026-09-12", channel: "HolidayHost", party: 4, gross: 1490 },
  { id: "b-13", propertyId: "p-10", guest: "Sarpong", from: "2026-09-05", to: "2026-09-12", channel: "Sykes", party: 7, gross: 2900 },
  { id: "b-14", propertyId: "p-14", guest: "Bloor", from: "2026-09-05", to: "2026-09-12", channel: "Airbnb", party: 3, gross: 1120 },
  { id: "b-15", propertyId: "p-13", guest: "Marchetti family", from: "2026-09-05", to: "2026-09-13", channel: "Owner", party: 9, gross: 0 },

  { id: "b-16", propertyId: "p-03", guest: "Lunt", from: "2026-09-04", to: "2026-09-08", channel: "Airbnb", party: 4, gross: 780 },
  { id: "b-17", propertyId: "p-03", guest: "Baxendale", from: "2026-09-08", to: "2026-09-12", channel: "Airbnb", party: 3, gross: 720 },
  { id: "b-18", propertyId: "p-07", guest: "Enright", from: "2026-09-06", to: "2026-09-11", channel: "HolidayHost", party: 5, gross: 1340 },
  { id: "b-19", propertyId: "p-08", guest: "Cadogan", from: "2026-09-07", to: "2026-09-11", channel: "Airbnb", party: 4, gross: 890 },
  { id: "b-20", propertyId: "p-12", guest: "Hollis", from: "2026-09-06", to: "2026-09-11", channel: "Sykes", party: 6, gross: 1420 },
  { id: "b-21", propertyId: "p-06", guest: "Kestrel trustees", from: "2026-09-09", to: "2026-09-13", channel: "Owner", party: 6, gross: 0 },
  { id: "b-22", propertyId: "p-05", guest: "Pemberton", from: "2026-09-11", to: "2026-09-18", channel: "Sykes", party: 6, gross: 2050 },
  { id: "b-23", propertyId: "p-11", guest: "Jelbert", from: "2026-09-11", to: "2026-09-18", channel: "Airbnb", party: 4, gross: 1090 },
];

// ─────────────── CHANGEOVER MOVEMENTS ───────────────

export type Movement = {
  propertyId: string;
  date: string;
  kind: "out" | "in" | "turnaround";
  out?: Booking;
  in?: Booking;
};

/** Derived from bookings, the way a script would derive it from iCal feeds. */
export function movementsOn(date: string): Movement[] {
  const leaving = bookings.filter((b) => b.to === date);
  const arriving = bookings.filter((b) => b.from === date);
  const ids = Array.from(
    new Set([...leaving, ...arriving].map((b) => b.propertyId))
  );
  const order: Record<Movement["kind"], number> = { turnaround: 0, out: 1, in: 2 };
  return ids
    .map((propertyId): Movement => {
      const o = leaving.find((b) => b.propertyId === propertyId);
      const i = arriving.find((b) => b.propertyId === propertyId);
      const kind: Movement["kind"] = o && i ? "turnaround" : o ? "out" : "in";
      return { propertyId, date, kind, out: o, in: i };
    })
    .sort((a, b) =>
      order[a.kind] !== order[b.kind]
        ? order[a.kind] - order[b.kind]
        : propertyName(a.propertyId).localeCompare(propertyName(b.propertyId))
    );
}

// ─────────────── HOUSEKEEPING JOBS ───────────────

export type CleanJob = {
  id: string;
  propertyId: string;
  date: string;
  /** null is the point — unassigned jobs are what a grid hides. */
  housekeeperId: string | null;
  hours: number;
  start: string;
  type: "Changeover" | "Departure clean" | "Arrival prep" | "Mid-stay" | "Deep clean";
};

export const cleanJobs: CleanJob[] = [
  { id: "c-01", propertyId: "p-01", date: "2026-09-05", housekeeperId: "h-01", hours: 6, start: "10:00", type: "Changeover" },
  { id: "c-02", propertyId: "p-02", date: "2026-09-05", housekeeperId: "h-06", hours: 4.5, start: "10:00", type: "Changeover" },
  { id: "c-03", propertyId: "p-04", date: "2026-09-05", housekeeperId: "h-04", hours: 7.5, start: "10:00", type: "Changeover" },
  { id: "c-04", propertyId: "p-05", date: "2026-09-05", housekeeperId: "h-05", hours: 4.5, start: "10:30", type: "Departure clean" },
  { id: "c-05", propertyId: "p-09", date: "2026-09-05", housekeeperId: null, hours: 4, start: "10:00", type: "Changeover" },
  { id: "c-06", propertyId: "p-10", date: "2026-09-05", housekeeperId: "h-08", hours: 6, start: "10:00", type: "Changeover" },
  { id: "c-07", propertyId: "p-11", date: "2026-09-05", housekeeperId: "h-09", hours: 3.5, start: "10:00", type: "Departure clean" },
  { id: "c-08", propertyId: "p-14", date: "2026-09-05", housekeeperId: "h-02", hours: 3, start: "10:00", type: "Changeover" },
  { id: "c-09", propertyId: "p-13", date: "2026-09-05", housekeeperId: null, hours: 6.5, start: "11:00", type: "Arrival prep" },
  { id: "c-10", propertyId: "p-01", date: "2026-09-05", housekeeperId: "h-07", hours: 2, start: "14:00", type: "Arrival prep" },

  { id: "c-11", propertyId: "p-07", date: "2026-09-06", housekeeperId: "h-05", hours: 4.5, start: "10:00", type: "Arrival prep" },
  { id: "c-12", propertyId: "p-12", date: "2026-09-06", housekeeperId: "h-09", hours: 4.5, start: "10:00", type: "Arrival prep" },

  { id: "c-13", propertyId: "p-08", date: "2026-09-07", housekeeperId: "h-05", hours: 3.5, start: "11:00", type: "Arrival prep" },
  { id: "c-14", propertyId: "p-06", date: "2026-09-07", housekeeperId: "h-01", hours: 5, start: "09:30", type: "Deep clean" },

  { id: "c-15", propertyId: "p-03", date: "2026-09-08", housekeeperId: "h-06", hours: 3.5, start: "10:00", type: "Changeover" },
  { id: "c-16", propertyId: "p-04", date: "2026-09-08", housekeeperId: "h-04", hours: 2, start: "14:00", type: "Mid-stay" },

  { id: "c-17", propertyId: "p-06", date: "2026-09-09", housekeeperId: "h-01", hours: 3, start: "10:00", type: "Arrival prep" },
  { id: "c-18", propertyId: "p-01", date: "2026-09-09", housekeeperId: "h-07", hours: 2, start: "13:00", type: "Mid-stay" },

  { id: "c-19", propertyId: "p-10", date: "2026-09-10", housekeeperId: "h-08", hours: 2, start: "10:00", type: "Mid-stay" },
  { id: "c-20", propertyId: "p-02", date: "2026-09-10", housekeeperId: "h-03", hours: 2, start: "11:00", type: "Mid-stay" },

  { id: "c-21", propertyId: "p-07", date: "2026-09-11", housekeeperId: "h-05", hours: 4.5, start: "10:00", type: "Departure clean" },
  { id: "c-22", propertyId: "p-08", date: "2026-09-11", housekeeperId: null, hours: 3.5, start: "10:00", type: "Departure clean" },
  { id: "c-23", propertyId: "p-12", date: "2026-09-11", housekeeperId: "h-09", hours: 4.5, start: "10:00", type: "Changeover" },
  { id: "c-24", propertyId: "p-05", date: "2026-09-11", housekeeperId: "h-06", hours: 4.5, start: "11:00", type: "Arrival prep" },
  { id: "c-25", propertyId: "p-11", date: "2026-09-11", housekeeperId: "h-10", hours: 3.5, start: "11:00", type: "Arrival prep" },
];

export const jobsOn = (date: string) => cleanJobs.filter((j) => j.date === date);

export const jobsFor = (housekeeperId: string, date: string) =>
  cleanJobs.filter((j) => j.housekeeperId === housekeeperId && j.date === date);

export const weekHoursFor = (housekeeperId: string) =>
  cleanJobs
    .filter((j) => WEEK.includes(j.date) && j.housekeeperId === housekeeperId)
    .reduce((sum, j) => sum + j.hours, 0);

export const unassignedJobs = cleanJobs.filter(
  (j) => j.housekeeperId === null && WEEK.includes(j.date)
);

/** A job assigned to someone who is down as absent that day. */
export const clashJobs = cleanJobs.filter(
  (j) => j.housekeeperId !== null && isAbsent(j.housekeeperId, j.date)
);

// ─────────────── LINEN ───────────────

export const LINEN_RULE = {
  king: { sheets: 1, duvets: 1, pillowcases: 4 },
  double: { sheets: 1, duvets: 1, pillowcases: 4 },
  twin: { sheets: 2, duvets: 2, pillowcases: 2 },
  single: { sheets: 1, duvets: 1, pillowcases: 1 },
  sofa: { sheets: 1, duvets: 1, pillowcases: 2 },
};

export type LinenLine = {
  propertyId: string;
  sheets: number;
  duvets: number;
  pillowcases: number;
  bathTowels: number;
  handTowels: number;
  bathMats: number;
  teaTowels: number;
};

export function linenFor(p: Property): LinenLine {
  let sheets = 0;
  let duvets = 0;
  let pillowcases = 0;
  (Object.keys(LINEN_RULE) as (keyof typeof LINEN_RULE)[]).forEach((k) => {
    const count = p.beds[k];
    sheets += count * LINEN_RULE[k].sheets;
    duvets += count * LINEN_RULE[k].duvets;
    pillowcases += count * LINEN_RULE[k].pillowcases;
  });
  return {
    propertyId: p.id,
    sheets,
    duvets,
    pillowcases,
    bathTowels: p.sleeps,
    handTowels: p.bathrooms * 2,
    bathMats: p.bathrooms,
    teaTowels: 3,
  };
}

export type StockLine = {
  item: string;
  perProperty: number;
  unit: string;
  supplier: string;
  leadDays: number;
};

export const stockRule: StockLine[] = [
  { item: "Toilet roll", perProperty: 8, unit: "rolls", supplier: "Kingsbridge Janitorial", leadDays: 3 },
  { item: "Washing up liquid", perProperty: 1, unit: "bottles", supplier: "Kingsbridge Janitorial", leadDays: 3 },
  { item: "Dishwasher tablets", perProperty: 12, unit: "tablets", supplier: "Kingsbridge Janitorial", leadDays: 3 },
  { item: "Hand soap", perProperty: 2, unit: "bottles", supplier: "Wave Bay Soap Co", leadDays: 5 },
  { item: "Guest soap bars", perProperty: 4, unit: "bars", supplier: "Wave Bay Soap Co", leadDays: 5 },
  { item: "Welcome hamper", perProperty: 1, unit: "hampers", supplier: "Slapton Preserves", leadDays: 7 },
  { item: "Milk, 2 pint", perProperty: 1, unit: "bottles", supplier: "Local dairy", leadDays: 1 },
];

// ─────────────── COMPLIANCE ───────────────

export type Certificate = {
  id: string;
  propertyId: string;
  kind:
    | "Gas safety"
    | "EICR"
    | "EPC"
    | "PAT test"
    | "Fire risk assessment"
    | "Legionella assessment"
    | "Hot tub water test"
    | "Chimney sweep";
  issued: string;
  expires: string;
  provider: string;
  interval: string;
};

export const certificates: Certificate[] = [
  { id: "cert-01", propertyId: "p-04", kind: "Gas safety", issued: "2025-08-12", expires: "2026-08-12", provider: "Dart Valley Heating", interval: "Annual" },
  { id: "cert-02", propertyId: "p-09", kind: "PAT test", issued: "2025-08-28", expires: "2026-08-28", provider: "Westcountry Fire Safety", interval: "Annual" },
  { id: "cert-03", propertyId: "p-01", kind: "Hot tub water test", issued: "2026-08-19", expires: "2026-09-02", provider: "In-house", interval: "Fortnightly" },
  { id: "cert-04", propertyId: "p-02", kind: "Gas safety", issued: "2025-09-09", expires: "2026-09-09", provider: "Dart Valley Heating", interval: "Annual" },
  { id: "cert-05", propertyId: "p-10", kind: "Hot tub water test", issued: "2026-08-26", expires: "2026-09-09", provider: "In-house", interval: "Fortnightly" },
  { id: "cert-06", propertyId: "p-14", kind: "Gas safety", issued: "2025-09-15", expires: "2026-09-15", provider: "Kingsbridge Gas Services", interval: "Annual" },
  { id: "cert-07", propertyId: "p-05", kind: "Fire risk assessment", issued: "2025-09-20", expires: "2026-09-20", provider: "Westcountry Fire Safety", interval: "Annual" },
  { id: "cert-08", propertyId: "p-13", kind: "Hot tub water test", issued: "2026-08-24", expires: "2026-09-07", provider: "In-house", interval: "Fortnightly" },
  { id: "cert-09", propertyId: "p-01", kind: "Gas safety", issued: "2025-10-02", expires: "2026-10-02", provider: "Dart Valley Heating", interval: "Annual" },
  { id: "cert-10", propertyId: "p-06", kind: "Gas safety", issued: "2025-10-14", expires: "2026-10-14", provider: "Dart Valley Heating", interval: "Annual" },
  { id: "cert-11", propertyId: "p-08", kind: "Gas safety", issued: "2025-11-03", expires: "2026-11-03", provider: "Yealm Plumbing", interval: "Annual" },
  { id: "cert-12", propertyId: "p-10", kind: "Gas safety", issued: "2025-11-21", expires: "2026-11-21", provider: "Start Bay Heating", interval: "Annual" },
  { id: "cert-13", propertyId: "p-04", kind: "EICR", issued: "2022-03-08", expires: "2027-03-08", provider: "Ashburton Electrical", interval: "Five-yearly" },
  { id: "cert-14", propertyId: "p-01", kind: "EICR", issued: "2023-05-17", expires: "2028-05-17", provider: "Ashburton Electrical", interval: "Five-yearly" },
  { id: "cert-15", propertyId: "p-03", kind: "EPC", issued: "2016-09-11", expires: "2026-09-11", provider: "South Hams Energy", interval: "Ten-yearly" },
  { id: "cert-16", propertyId: "p-07", kind: "EPC", issued: "2017-06-30", expires: "2027-06-30", provider: "South Hams Energy", interval: "Ten-yearly" },
  { id: "cert-17", propertyId: "p-11", kind: "Gas safety", issued: "2025-12-05", expires: "2026-12-05", provider: "Rame Heating", interval: "Annual" },
  { id: "cert-18", propertyId: "p-13", kind: "Chimney sweep", issued: "2025-10-08", expires: "2026-10-08", provider: "Blackdown Sweeps", interval: "Annual" },
  { id: "cert-19", propertyId: "p-06", kind: "Legionella assessment", issued: "2024-09-25", expires: "2026-09-25", provider: "In-house", interval: "Two-yearly" },
  { id: "cert-20", propertyId: "p-12", kind: "Fire risk assessment", issued: "2025-12-18", expires: "2026-12-18", provider: "Rame Fire Safety", interval: "Annual" },
];

// ─────────────── CONTRACTORS ───────────────

export type Contractor = {
  id: string;
  name: string;
  trade: string;
  publicLiabilityExpires: string;
  registration: string | null;
  registrationExpires: string | null;
  dayRate: number;
};

export const contractors: Contractor[] = [
  { id: "t-01", name: "Dart Valley Heating", trade: "Gas & heating", publicLiabilityExpires: "2027-02-14", registration: "Gas Safe 214877", registrationExpires: "2026-08-30", dayRate: 340 },
  { id: "t-02", name: "Ashburton Electrical", trade: "Electrical", publicLiabilityExpires: "2026-09-18", registration: "NICEIC 88214", registrationExpires: "2027-01-22", dayRate: 380 },
  { id: "t-03", name: "Estuary Joinery", trade: "Carpentry", publicLiabilityExpires: "2027-05-02", registration: null, registrationExpires: null, dayRate: 300 },
  { id: "t-04", name: "Westcountry Fire Safety", trade: "Fire & alarms", publicLiabilityExpires: "2027-03-30", registration: "BAFE 6621", registrationExpires: "2027-03-30", dayRate: 420 },
  { id: "t-05", name: "Salcombe Property Services", trade: "General maintenance", publicLiabilityExpires: "2026-09-26", registration: null, registrationExpires: null, dayRate: 260 },
  { id: "t-06", name: "Kingsbridge Gas Services", trade: "Gas & heating", publicLiabilityExpires: "2027-04-11", registration: "Gas Safe 331902", registrationExpires: "2027-04-11", dayRate: 320 },
  { id: "t-07", name: "Blackdown Sweeps", trade: "Chimney", publicLiabilityExpires: "2026-11-08", registration: "HETAS 4471", registrationExpires: "2026-11-08", dayRate: 180 },
  { id: "t-08", name: "Yealm Plumbing", trade: "Plumbing", publicLiabilityExpires: "2027-07-19", registration: "Gas Safe 552013", registrationExpires: "2027-07-19", dayRate: 310 },
  { id: "t-09", name: "Slapton Garden Care", trade: "Gardening", publicLiabilityExpires: "2026-10-05", registration: null, registrationExpires: null, dayRate: 220 },
  { id: "t-10", name: "Rame Heating", trade: "Gas & heating", publicLiabilityExpires: "2027-01-30", registration: "Gas Safe 470118", registrationExpires: "2027-01-30", dayRate: 330 },
];

// ─────────────── COSTS & STATEMENTS ───────────────

export type Cost = {
  id: string;
  propertyId: string;
  date: string;
  supplier: string;
  description: string;
  net: number;
  allocated: boolean;
};

export const costs: Cost[] = [
  { id: "x-01", propertyId: "p-01", date: "2026-08-04", supplier: "Dart Valley Heating", description: "Boiler service", net: 148, allocated: true },
  { id: "x-02", propertyId: "p-01", date: "2026-08-12", supplier: "Slapton Garden Care", description: "Garden maintenance, 2 visits", net: 240, allocated: true },
  { id: "x-03", propertyId: "p-01", date: "2026-08-22", supplier: "Estuary Joinery", description: "Replace window catch", net: 95, allocated: true },
  { id: "x-04", propertyId: "p-02", date: "2026-08-07", supplier: "Salcombe Property Services", description: "Clear blocked gutter", net: 130, allocated: true },
  { id: "x-05", propertyId: "p-04", date: "2026-08-03", supplier: "Ashburton Electrical", description: "Replace outdoor lighting circuit", net: 465, allocated: true },
  { id: "x-06", propertyId: "p-04", date: "2026-08-18", supplier: "Slapton Garden Care", description: "Garden maintenance, 4 visits", net: 480, allocated: true },
  { id: "x-07", propertyId: "p-04", date: "2026-08-27", supplier: "Westcountry Fire Safety", description: "Alarm panel fault call-out", net: 210, allocated: true },
  { id: "x-08", propertyId: "p-05", date: "2026-08-09", supplier: "Yealm Plumbing", description: "Shower mixer replacement", net: 275, allocated: true },
  { id: "x-09", propertyId: "p-09", date: "2026-08-15", supplier: "Salcombe Property Services", description: "Touch-up decorating, hallway", net: 190, allocated: true },
  { id: "x-10", propertyId: "p-10", date: "2026-08-06", supplier: "Start Bay Heating", description: "Hot tub pump repair", net: 385, allocated: true },
  { id: "x-11", propertyId: "p-10", date: "2026-08-20", supplier: "Slapton Garden Care", description: "Garden maintenance, 3 visits", net: 360, allocated: true },
  { id: "x-12", propertyId: "p-13", date: "2026-08-11", supplier: "Blackdown Sweeps", description: "Chimney sweep, two flues", net: 165, allocated: true },
  { id: "x-13", propertyId: "p-14", date: "2026-08-25", supplier: "Kingsbridge Gas Services", description: "Radiator valve replacement", net: 120, allocated: true },
  { id: "x-14", propertyId: "p-07", date: "2026-08-14", supplier: "Estuary Joinery", description: "Rehang bedroom door", net: 85, allocated: true },
  { id: "x-15", propertyId: "p-11", date: "2026-08-19", supplier: "Rame Heating", description: "Immersion heater fault", net: 195, allocated: true },
  { id: "x-16", propertyId: "p-12", date: "2026-08-23", supplier: "Salcombe Property Services", description: "Replace bathroom extractor", net: 165, allocated: true },
  { id: "x-17", propertyId: "p-06", date: "2026-08-28", supplier: "Slapton Garden Care", description: "Hedge cutting", net: 320, allocated: true },
  { id: "x-18", propertyId: "", date: "2026-08-21", supplier: "Kingsbridge Janitorial", description: "Consumables, bulk delivery across nine properties", net: 412, allocated: false },
  { id: "x-19", propertyId: "", date: "2026-08-29", supplier: "Estuary Joinery", description: "Materials, no property reference on the invoice", net: 178, allocated: false },
  { id: "x-20", propertyId: "", date: "2026-08-30", supplier: "Dart Valley Heating", description: "Call-out, address illegible on the docket", net: 96, allocated: false },
];

export type Statement = {
  ownerId: string;
  status: "Draft" | "Ready" | "Approved" | "Sent";
};

export const STATEMENT_MONTH = "August 2026";

export const statements: Statement[] = [
  { ownerId: "o-01", status: "Ready" },
  { ownerId: "o-02", status: "Ready" },
  { ownerId: "o-03", status: "Draft" },
  { ownerId: "o-04", status: "Ready" },
  { ownerId: "o-05", status: "Approved" },
  { ownerId: "o-06", status: "Ready" },
  { ownerId: "o-07", status: "Approved" },
  { ownerId: "o-08", status: "Draft" },
  { ownerId: "o-09", status: "Ready" },
  { ownerId: "o-10", status: "Approved" },
];

/** August let income per property — the income side of each statement. */
export const augustIncome: Record<string, number> = {
  "p-01": 12400, "p-02": 6850, "p-03": 3120, "p-04": 18600, "p-05": 7940,
  "p-06": 0, "p-07": 5480, "p-08": 3760, "p-09": 5210, "p-10": 11300,
  "p-11": 4180, "p-12": 5060, "p-13": 0, "p-14": 4320,
};

export type StatementTotals = {
  ownerId: string;
  income: number;
  fee: number;
  costs: number;
  markup: number;
  net: number;
  propertyIds: string[];
};

export function statementTotals(ownerId: string): StatementTotals {
  const owner = ownerById(ownerId);
  const mine = properties.filter((p) => p.ownerId === ownerId);
  const income = mine.reduce((s, p) => s + (augustIncome[p.id] ?? 0), 0);
  const feePercent = owner ? owner.feePercent : 0;
  const markupPercent = owner ? owner.markupPercent : 0;
  const fee = Math.round((income * feePercent) / 100);
  const myCosts = costs.filter(
    (c) => c.allocated && mine.some((p) => p.id === c.propertyId)
  );
  const cost = myCosts.reduce((s, c) => s + c.net, 0);
  const markup = Math.round((cost * markupPercent) / 100);
  return {
    ownerId,
    income,
    fee,
    costs: cost,
    markup,
    net: income - fee - cost - markup,
    propertyIds: mine.map((p) => p.id),
  };
}

export const costsForOwner = (ownerId: string) =>
  costs.filter(
    (c) =>
      c.allocated &&
      properties.some((p) => p.id === c.propertyId && p.ownerId === ownerId)
  );

export const unallocatedCosts = costs.filter((c) => !c.allocated);

// ─────────────── HEADLINE FIGURES ───────────────

export const summary = {
  properties: properties.length,
  owners: owners.length,
  staff: housekeepers.length,
  peakJobs: jobsOn(PEAK_DAY).length,
  unassigned: unassignedJobs.length,
  clashes: clashJobs.length,
  expiredCerts: certificates.filter((c) => urgencyOf(c.expires) === "overdue")
    .length,
  unallocated: unallocatedCosts.length,
  unallocatedValue: unallocatedCosts.reduce((s, c) => s + c.net, 0),
};
