'use strict';
// Every automatic figure or date in the app comes from a function in this file.
// Money is always whole pence (integers). Dates are ISO strings: YYYY-MM-DD.

// ---------- money ----------
function lineNet(qty, unitPence) {
  return Math.round(Number(qty || 0) * Number(unitPence || 0));
}
function lineVat(netPence, ratePct) {
  return Math.round(netPence * Number(ratePct || 0) / 100);
}
function totals(lines, opts = {}) {
  const vatRegistered = opts.vatRegistered !== false;
  const reverseCharge = !!opts.reverseCharge;
  let net = 0, vat = 0, notionalVat = 0;
  const byRate = {};
  for (const l of lines) {
    const sign = l.sign === -1 ? -1 : 1;
    const n = sign * lineNet(l.qty, l.unit_price);
    const rate = vatRegistered ? Number(l.vat_rate || 0) : 0;
    const v = lineVat(n, rate);
    net += n;
    byRate[rate] = byRate[rate] || { net: 0, vat: 0 };
    byRate[rate].net += n;
    byRate[rate].vat += v;
    if (reverseCharge) notionalVat += v; else vat += v;
  }
  return { net, vat, gross: net + vat, byRate, notionalVat };
}
function parseMoney(input) {
  if (input === null || input === undefined) return 0;
  const s = String(input).replace(/[£,\s]/g, '');
  if (s === '' || s === '-') return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}

// ---------- dates ----------
function pad(n) { return String(n).padStart(2, '0'); }
function isoDate(d) { return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
function parseIso(s) { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); }
function today() { const n = new Date(); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`; }
function addMonths(iso, months) {
  const [y, m, d] = iso.split('-').map(Number);
  const total = (y * 12 + (m - 1)) + months;
  const ny = Math.floor(total / 12), nm = total % 12;
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${pad(nm + 1)}-${pad(Math.min(d, lastDay))}`;
}
function addDays(iso, days) { const t = parseIso(iso); t.setUTCDate(t.getUTCDate() + days); return isoDate(t); }
function daysBetween(fromIso, toIso) { return Math.round((parseIso(toIso) - parseIso(fromIso)) / 864e5); }
function endOfMonth(y, m) { return isoDate(new Date(Date.UTC(y, m, 0))); } // m is 1-12

// ---------- postcode region (England and Wales only) ----------
const SCOTTISH_AREAS = ['AB', 'DD', 'DG', 'EH', 'FK', 'G', 'HS', 'IV', 'KA', 'KW', 'KY', 'ML', 'PA', 'PH', 'TD', 'ZE'];
const POSTCODE_RE = /^([A-Z]{1,2})([0-9][A-Z0-9]?) ?([0-9][A-Z]{2})$/;
function normalisePostcode(pc) {
  const s = String(pc || '').toUpperCase().replace(/\s+/g, '');
  if (s.length < 5) return s;
  return `${s.slice(0, -3)} ${s.slice(-3)}`;
}
// Offline rule from the postcode area. The app prefers an exact country lookup when online.
function postcodeRegionByArea(pc) {
  const norm = normalisePostcode(pc);
  const m = norm.match(POSTCODE_RE);
  if (!m) return { valid: false, allowed: false, postcode: norm, country: null, reason: 'Enter a full UK postcode, for example TQ7 3JQ.' };
  const area = m[1], outward = m[1] + m[2];
  if (area === 'BT') return { valid: true, allowed: false, postcode: norm, country: 'Northern Ireland' };
  if (['IM', 'JE', 'GY'].includes(area)) return { valid: true, allowed: false, postcode: norm, country: 'Crown Dependencies' };
  if (outward === 'TD15' || outward === 'TD12') return { valid: true, allowed: true, postcode: norm, country: 'England' };
  if (SCOTTISH_AREAS.includes(area)) return { valid: true, allowed: false, postcode: norm, country: 'Scotland' };
  return { valid: true, allowed: true, postcode: norm, country: 'England or Wales' };
}
function regionFromCountry(country, norm) {
  const allowed = country === 'England' || country === 'Wales';
  return { valid: true, allowed, postcode: norm, country };
}

// ---------- Making Tax Digital for Income Tax ----------
// Bands: 'upto20' (£20,000 or less), '20to30', '30to50', 'over50' (more than £50,000)
function mtdIncomeTaxStart(structure, band2425, band2526) {
  if (structure !== 'sole_trader') return { status: 'not_applicable', date: null, text: 'Not applicable: Income Tax MTD only covers sole traders and landlords.' };
  if (band2425 === 'over50') return { status: 'required', date: '2026-04-06', text: 'Required from 6 April 2026 (income over £50,000 in 2024/25).' };
  if (band2526 === 'over50' || band2526 === '30to50') return { status: 'required', date: '2027-04-06', text: 'Required from 6 April 2027 (income over £30,000 in 2025/26).' };
  if (band2526 === '20to30') return { status: 'expected', date: '2028-04-06', text: 'Expected from 6 April 2028 if 2026/27 income is over £20,000.' };
  if (!band2425 && !band2526) return { status: 'unknown', date: null, text: 'Add your income bands to work out your start date.' };
  return { status: 'not_yet', date: null, text: 'Not required yet. Checked again when your 2026/27 figures are in.' };
}
// Quarterly update periods and deadlines for a tax year starting 6 April of `startYear`.
function mtdQuarters(startYear) {
  const y = startYear;
  return [
    { start: `${y}-04-06`, end: `${y}-07-05`, due: `${y}-08-07` },
    { start: `${y}-07-06`, end: `${y}-10-05`, due: `${y}-11-07` },
    { start: `${y}-10-06`, end: `${y + 1}-01-05`, due: `${y + 1}-02-07` },
    { start: `${y + 1}-01-06`, end: `${y + 1}-04-05`, due: `${y + 1}-05-07` },
  ];
}
function nextMtdDeadline(startDateIso, onIso) {
  if (!startDateIso || onIso < startDateIso) return null;
  const y = Number(onIso.slice(0, 4));
  for (const yr of [y - 1, y, y + 1]) {
    for (const q of mtdQuarters(yr)) {
      if (q.start >= startDateIso && q.due >= onIso) return q;
    }
  }
  return null;
}

// ---------- VAT periods ----------
// stagger: 1 = quarters ending Mar/Jun/Sep/Dec, 2 = Jan/Apr/Jul/Oct, 3 = Feb/May/Aug/Nov
function staggerEndMonths(stagger) {
  const s = Number(stagger || 1);
  return [3, 6, 9, 12].map(m => ((m - 1 + (s - 1)) % 12) + 1).sort((a, b) => a - b);
}
function vatPeriods(regDateIso, stagger, untilIso) {
  if (!regDateIso) return [];
  const ends = staggerEndMonths(stagger);
  const periods = [];
  let start = regDateIso;
  let guard = 0;
  while (start <= untilIso && guard++ < 200) {
    const [sy, sm] = start.split('-').map(Number);
    let ey = sy, em = ends.find(m => m >= sm);
    if (!em) { ey = sy + 1; em = ends[0]; }
    const end = endOfMonth(ey, em);
    // Due one calendar month and seven days after the period ends.
    const due = addDays(endOfMonth(Number(addMonths(end.slice(0, 7) + '-01', 1).slice(0, 4)), Number(addMonths(end.slice(0, 7) + '-01', 1).slice(5, 7))), 7);
    periods.push({ start, end, due });
    start = addDays(end, 1);
  }
  return periods;
}

// ---------- VAT return (9 boxes) ----------
// invoices: [{issue_date, net, vat, gross, reverse_charge}]  (issued, not void)
// payments: [{date, amount, invoice: {net, vat, gross, reverse_charge}}]
// expenses: [{date, net, vat}]
function vatReturn({ scheme, flatRatePct, period, invoices, payments, expenses }) {
  const inP = d => d >= period.start && d <= period.end;
  let box1 = 0, box6p = 0, box4 = 0, box7p = 0;
  const salesRecords = [];
  if (scheme === 'cash') {
    for (const p of payments.filter(p => inP(p.date))) {
      const inv = p.invoice;
      const vatPart = inv.gross ? Math.round(inv.vat * p.amount / inv.gross) : 0;
      const netPart = p.amount - vatPart;
      box1 += vatPart; box6p += netPart;
      salesRecords.push({ date: p.date, ref: inv.number, net: netPart, vat: vatPart, basis: 'payment received' });
    }
  } else if (scheme === 'flat') {
    let turnover = 0;
    for (const i of invoices.filter(i => inP(i.issue_date))) {
      if (i.reverse_charge) { box6p += i.net; salesRecords.push({ date: i.issue_date, ref: i.number, net: i.net, vat: 0, basis: 'reverse charge' }); continue; }
      turnover += i.gross;
      salesRecords.push({ date: i.issue_date, ref: i.number, net: i.net, vat: i.vat, basis: 'flat rate turnover (gross)' });
    }
    box1 = Math.round(turnover * Number(flatRatePct || 0) / 100);
    box6p += turnover;
  } else {
    for (const i of invoices.filter(i => inP(i.issue_date))) {
      box1 += i.reverse_charge ? 0 : i.vat; box6p += i.net;
      salesRecords.push({ date: i.issue_date, ref: i.number, net: i.net, vat: i.reverse_charge ? 0 : i.vat, basis: i.reverse_charge ? 'reverse charge' : 'invoice date' });
    }
  }
  const purchaseRecords = expenses.filter(e => inP(e.date));
  for (const e of purchaseRecords) { box7p += e.net; if (scheme !== 'flat') box4 += e.vat; }
  const box2 = 0, box3 = box1 + box2, net = box3 - box4;
  const pounds = p => Math.trunc(p / 100) * 100; // boxes 6–9 are whole pounds
  return {
    boxes: { box1, box2, box3, box4, box5: Math.abs(net), box6: pounds(box6p), box7: pounds(box7p), box8: 0, box9: 0 },
    direction: net >= 0 ? 'pay' : 'reclaim',
    salesRecords, purchaseRecords,
  };
}

// ---------- gas certificate due dates ----------
// Landlord gas safety record: a check done in the 2 months before the current deadline keeps that deadline + 12 months.
function lgsrNextDue(issueIso, previousDueIso) {
  if (previousDueIso && issueIso <= previousDueIso && issueIso >= addMonths(previousDueIso, -2)) {
    return { date: addMonths(previousDueIso, 12), keptDeadline: true };
  }
  return { date: addMonths(issueIso, 12), keptDeadline: false };
}
function serviceNextDue(issueIso) { return addMonths(issueIso, 12); }
function gasSafeNotificationDeadline(commissionIso) { return addDays(commissionIso, 30); }

function reminderBucket(daysLeft) {
  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 7) return '7';
  if (daysLeft <= 30) return '30';
  if (daysLeft <= 60) return '60';
  return null;
}

// ---------- reverse charge ----------
function reverseChargeApplies(client) {
  return !!(client && client.vat_registered && client.cis_contractor && !client.end_user_notice);
}

module.exports = {
  lineNet, lineVat, totals, parseMoney,
  today, addMonths, addDays, daysBetween, endOfMonth,
  normalisePostcode, postcodeRegionByArea, regionFromCountry,
  mtdIncomeTaxStart, mtdQuarters, nextMtdDeadline,
  staggerEndMonths, vatPeriods, vatReturn,
  lgsrNextDue, serviceNextDue, gasSafeNotificationDeadline, reminderBucket,
  reverseChargeApplies,
};
