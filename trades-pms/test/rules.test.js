'use strict';
// Run with: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../src/rules');
const { open } = require('../src/db');

test('postcode region: England and Wales only', () => {
  assert.equal(R.postcodeRegionByArea('tq73jq').allowed, true);
  assert.equal(R.postcodeRegionByArea('tq73jq').postcode, 'TQ7 3JQ');
  assert.equal(R.postcodeRegionByArea('CF10 1AA').allowed, true);
  assert.equal(R.postcodeRegionByArea('GL1 1AA').allowed, true);
  assert.equal(R.postcodeRegionByArea('TD15 1AA').allowed, true);
  assert.equal(R.postcodeRegionByArea('EH1 1YZ').country, 'Scotland');
  assert.equal(R.postcodeRegionByArea('G1 1AA').allowed, false);
  assert.equal(R.postcodeRegionByArea('BT1 1AA').country, 'Northern Ireland');
  assert.equal(R.postcodeRegionByArea('JE2 3AB').allowed, false);
  assert.equal(R.postcodeRegionByArea('nonsense').valid, false);
});

test('MTD for Income Tax start date', () => {
  assert.equal(R.mtdIncomeTaxStart('sole_trader', 'over50', 'over50').date, '2026-04-06');
  assert.equal(R.mtdIncomeTaxStart('sole_trader', '30to50', 'over50').date, '2027-04-06');
  assert.equal(R.mtdIncomeTaxStart('sole_trader', '20to30', '30to50').date, '2027-04-06');
  assert.equal(R.mtdIncomeTaxStart('sole_trader', 'upto20', '20to30').status, 'expected');
  assert.equal(R.mtdIncomeTaxStart('sole_trader', 'upto20', 'upto20').status, 'not_yet');
  assert.equal(R.mtdIncomeTaxStart('limited', 'over50', 'over50').status, 'not_applicable');
  assert.deepEqual(R.nextMtdDeadline('2027-04-06', '2027-08-01'), { start: '2027-04-06', end: '2027-07-05', due: '2027-08-07' });
});

test('dates and gas due dates', () => {
  assert.equal(R.addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(R.addMonths('2028-02-29', 12), '2029-02-28');
  assert.deepEqual(R.lgsrNextDue('2026-11-02', null), { date: '2027-11-02', keptDeadline: false });
  assert.deepEqual(R.lgsrNextDue('2027-09-15', '2027-11-02'), { date: '2028-11-02', keptDeadline: true });
  assert.deepEqual(R.lgsrNextDue('2027-08-01', '2027-11-02'), { date: '2028-08-01', keptDeadline: false });
  assert.equal(R.gasSafeNotificationDeadline('2026-11-02'), '2026-12-02');
  assert.equal(R.reminderBucket(-1), 'overdue');
  assert.equal(R.reminderBucket(7), '7');
  assert.equal(R.reminderBucket(31), '60');
  assert.equal(R.reminderBucket(61), null);
});

test('VAT periods and due dates', () => {
  const p = R.vatPeriods('2026-08-01', 1, '2026-11-02');
  assert.deepEqual(p, [
    { start: '2026-08-01', end: '2026-09-30', due: '2026-11-07' },
    { start: '2026-10-01', end: '2026-12-31', due: '2027-02-07' },
  ]);
  assert.deepEqual(R.staggerEndMonths(2), [1, 4, 7, 10]);
  assert.equal(R.vatPeriods('2026-02-10', 3, '2026-03-01')[0].end, '2026-02-28');
});

test('end to end: estimate versions, variations, invoice, payments and VAT boxes', () => {
  const db = open(':memory:');
  db.createAccount({ owner_name: 'Wayne Test', email: 'w@example.com', business_name: 'Test Heating', address_line1: '1 High St', town: 'Kingsbridge', postcode: 'TQ7 1AA', country: 'England', trades: ['gas'] });
  db.saveBusiness({ structure: 'sole_trader', vat_registered: true, vat_number: 'GB123456789', vat_reg_date: '2026-08-01', vat_scheme: 'standard', vat_stagger: 1, gas_safe_reg: '123456' });
  db.completeWizard();
  const c = db.saveClient({ name: 'Mrs Smith', type: 'homeowner' });
  const p = db.saveProperty({ client_id: c.id, address_line1: '2 Fore St', postcode: 'tq71aa' });
  const job = db.createJob({ client_id: c.id, property_id: p.id, title: 'Boiler swap' });
  assert.equal(job.ref, 'J-1001');

  db.saveRevision(job.id, [
    { description: 'Combi boiler', qty: 1, unit_price: 180000, vat_rate: 20, kind: 'material' },
    { description: 'Labour', qty: 8, unit_price: 4500, vat_rate: 20, kind: 'labour' },
  ], '');
  assert.throws(() => db.saveRevision(job.id, [{ description: 'x', qty: 1, unit_price: 1, vat_rate: 20 }], ''), /what changed/);
  let j = db.saveRevision(job.id, [
    { description: 'Combi boiler', qty: 1, unit_price: 175000, vat_rate: 20, kind: 'material' },
    { description: 'Labour', qty: 8, unit_price: 4500, vat_rate: 20, kind: 'labour' },
  ], 'Cheaper boiler model');
  assert.equal(j.revisions.length, 2);
  assert.equal(j.revisions[0].totals.gross, 259200);
  assert.equal(j.revisions[1].totals.gross, 253200);
  assert.throws(() => db.acceptRevision(j.revisions[0].id, { name: 'Mrs Smith', method: 'verbal' }), /latest/);
  j = db.acceptRevision(j.revisions[1].id, { name: 'Mrs Smith', method: 'signed', signature: 'data:image/png;base64,AAA' });
  assert.equal(j.status, 'accepted');
  assert.throws(() => db.saveRevision(job.id, [{ description: 'x', qty: 1, unit_price: 1 }], 'n'), /accepted/);

  j = db.addVariation({ job_id: job.id, kind: 'extra', description: 'Magnetic filter', qty: 1, unit_price: 12000, vat_rate: 20 });
  j = db.addVariation({ job_id: job.id, kind: 'omission', description: 'TRVs not needed', qty: 1, unit_price: 4000, vat_rate: 20 });
  assert.equal(j.totals.pendingExtras, 14400);
  assert.throws(() => db.createInvoiceFromJob(job.id), /pending/);
  db.decideVariation(j.variations[0].id, 'approve', { by: 'Mrs Smith', method: 'in_person' });
  j = db.decideVariation(j.variations[1].id, 'approve', { by: 'Mrs Smith', method: 'phone' });
  assert.equal(j.totals.total, 262800);
  assert.equal(j.totals.totalNet, 219000);

  const inv = db.createInvoiceFromJob(job.id, { issue_date: '2026-10-15' });
  assert.equal(inv.number, 'INV-0001');
  assert.deepEqual([inv.net, inv.vat, inv.gross], [219000, 43800, 262800]);
  assert.equal(inv.due_date, '2026-10-29');
  assert.throws(() => db.addPayment(inv.id, { amount: 300000, date: '2026-10-20' }), /more than/);
  db.addPayment(inv.id, { amount: 100000, date: '2026-10-20', method: 'transfer' });
  const paid = db.addPayment(inv.id, { amount: 162800, date: '2026-11-01', method: 'cheque' });
  assert.equal(paid.status, 'paid');
  assert.equal(db.getJob(job.id).status, 'paid');

  db.saveExpense({ date: '2026-10-10', payee: 'Wolseley', net: 150000, vat: 30000, job_id: job.id });

  let v = db.vatSummary(1);
  assert.deepEqual(v.boxes, { box1: 43800, box2: 0, box3: 43800, box4: 30000, box5: 13800, box6: 219000, box7: 150000, box8: 0, box9: 0 });
  assert.equal(v.direction, 'pay');

  db.saveBusiness({ vat_scheme: 'cash' });
  v = db.vatSummary(1);
  assert.equal(v.boxes.box1, 43800);
  assert.deepEqual(v.salesRecords.map(r => r.vat), [16667, 27133]);
  assert.equal(v.boxes.box6, 219000);

  db.saveBusiness({ vat_scheme: 'flat', flat_rate_pct: 12.5 });
  v = db.vatSummary(1);
  assert.equal(v.boxes.box1, 32850);
  assert.equal(v.boxes.box4, 0);
  assert.equal(v.boxes.box6, 262800);
});

test('certificates: numbering, kept deadline, due list, notification tracker', () => {
  const db = open(':memory:');
  db.createAccount({ owner_name: 'W', business_name: 'B', address_line1: 'a', postcode: 'TQ7 1AA', trades: ['gas'] });
  const c = db.saveClient({ name: 'Landlord Ltd', type: 'landlord' });
  const p = db.saveProperty({ client_id: c.id, address_line1: '3 Quay', postcode: 'PL1 1AA', tenure: 'private_rented' });
  const a = db.saveAsset({ property_id: p.id, appliance_type: 'Boiler', make: 'Worcester', location: 'Kitchen' });
  const base = { client_id: c.id, property_id: p.id, signature: 'data:image/png;base64,AAA' };
  const one = db.saveCertificate({ ...base, type: 'lgsr', issue_date: '2026-11-02', data: { appliances: [{ appliance_type: 'Boiler' }] } });
  assert.equal(one.number, 'LGSR-00001');
  assert.equal(one.next_due, '2027-11-02');
  const two = db.saveCertificate({ ...base, type: 'lgsr', issue_date: '2027-09-20', data: { appliances: [{ appliance_type: 'Boiler' }] } });
  assert.equal(two.next_due, '2028-11-02');
  assert.equal(two.kept_deadline, 1);
  db.saveCertificate({ ...base, type: 'commissioning', asset_id: a.id, issue_date: '2026-10-20', data: {} });
  const due = db.dueList('2027-10-01');
  assert.equal(due.length, 2);
  assert.equal(due.find(d => d.type === 'lgsr').next_due, '2028-11-02');
  assert.equal(due.find(d => d.type === 'commissioning').bucket, '30');
  const n = db.notificationTracker('2026-11-02');
  assert.equal(n.length, 1);
  assert.equal(n[0].deadline, '2026-11-19');
  assert.throws(() => db.saveCertificate({ ...base, type: 'lgsr', issue_date: '2026-11-02', signature: null, data: { appliances: [{}] } }), /Sign/);
});

test('CO/CO2 ratio is worked out from the readings', () => {
  const L = require('../src/shared/labels');
  assert.equal(L.coRatio('6', '9.2'), '0.0001');
  assert.equal(L.coRatio('40', '9'), '0.0004');
  assert.equal(L.coRatio('0', '9.1'), '0.0000');
  assert.equal(L.coRatio('', '9.1'), '');
  assert.equal(L.coRatio('8', ''), '');
  assert.equal(L.frsSectors.find(x => x[0] === 'general_building')[2], 9.5);
  assert.equal(L.frsSectors.find(x => x[0] === 'limited_cost')[2], 16.5);
});

test('payment terms: due on completion makes the invoice due the same day', () => {
  const db = open(':memory:');
  db.createAccount({ owner_name: 'W', business_name: 'B', address_line1: 'a', postcode: 'TQ7 1AA', trades: ['gas'] });
  db.saveBusiness({ structure: 'sole_trader', vat_registered: false, payment_terms_days: 0, gas_safe_reg: '000000' });
  const c = db.saveClient({ name: 'C' });
  const job = db.createJob({ client_id: c.id, title: 'Boiler service' });
  const j = db.saveRevision(job.id, [{ description: 'Boiler service', qty: 1, unit_price: 7500, vat_rate: 20, kind: 'labour' }], '');
  db.acceptRevision(j.revisions[0].id, { name: 'C', method: 'booking' });
  const inv = db.createInvoiceFromJob(job.id, { issue_date: '2026-11-03' });
  assert.equal(inv.due_date, '2026-11-03');
  assert.deepEqual([inv.net, inv.vat, inv.gross], [7500, 0, 7500]);
});
