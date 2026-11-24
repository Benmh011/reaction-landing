'use strict';
const { DatabaseSync } = require('node:sqlite');
const R = require('./rules');

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS account (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  owner_name TEXT, email TEXT, phone TEXT, business_name TEXT,
  address_line1 TEXT, town TEXT, postcode TEXT, country TEXT,
  trades TEXT NOT NULL DEFAULT '[]', plan TEXT, licence_key TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS business (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL DEFAULT '{}',
  wizard_done INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS seq (name TEXT PRIMARY KEY, value INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'homeowner',
  email TEXT, phone TEXT, address_line1 TEXT, address_line2 TEXT, town TEXT, postcode TEXT,
  vat_registered INTEGER NOT NULL DEFAULT 0, cis_contractor INTEGER NOT NULL DEFAULT 0, end_user_notice INTEGER NOT NULL DEFAULT 0,
  notes TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS properties (
  id INTEGER PRIMARY KEY, client_id INTEGER NOT NULL REFERENCES clients(id),
  address_line1 TEXT NOT NULL, address_line2 TEXT, town TEXT, postcode TEXT,
  tenure TEXT NOT NULL DEFAULT 'owner_occupied', occupier_name TEXT, occupier_phone TEXT, occupier_email TEXT
);
CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY, property_id INTEGER NOT NULL REFERENCES properties(id),
  kind TEXT NOT NULL DEFAULT 'gas_appliance', appliance_type TEXT, make TEXT, model TEXT, location TEXT,
  flue_type TEXT, serial TEXT, install_date TEXT, landlord_owned INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY, ref TEXT NOT NULL UNIQUE, client_id INTEGER NOT NULL REFERENCES clients(id),
  property_id INTEGER REFERENCES properties(id), title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'enquiry',
  accepted_revision_id INTEGER, created_at TEXT NOT NULL, completed_at TEXT
);
CREATE TABLE IF NOT EXISTS estimate_revisions (
  id INTEGER PRIMARY KEY, job_id INTEGER NOT NULL REFERENCES jobs(id), number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', change_note TEXT, created_at TEXT NOT NULL, sent_at TEXT, accepted_at TEXT,
  UNIQUE (job_id, number)
);
CREATE TABLE IF NOT EXISTS estimate_lines (
  id INTEGER PRIMARY KEY, revision_id INTEGER NOT NULL REFERENCES estimate_revisions(id), sort INTEGER NOT NULL,
  description TEXT NOT NULL, qty REAL NOT NULL, unit_price INTEGER NOT NULL, vat_rate REAL NOT NULL,
  kind TEXT NOT NULL DEFAULT 'material', supplier TEXT, sku TEXT, url TEXT
);
CREATE TABLE IF NOT EXISTS acceptances (
  id INTEGER PRIMARY KEY, revision_id INTEGER NOT NULL REFERENCES estimate_revisions(id),
  name TEXT NOT NULL, method TEXT NOT NULL, signature TEXT, accepted_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS variations (
  id INTEGER PRIMARY KEY, job_id INTEGER NOT NULL REFERENCES jobs(id), kind TEXT NOT NULL,
  description TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'material', qty REAL NOT NULL, unit_price INTEGER NOT NULL,
  vat_rate REAL NOT NULL, status TEXT NOT NULL DEFAULT 'pending', approved_by TEXT, approved_method TEXT,
  decided_at TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY, job_id INTEGER NOT NULL REFERENCES jobs(id), number TEXT NOT NULL UNIQUE,
  issue_date TEXT NOT NULL, due_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'issued',
  reverse_charge INTEGER NOT NULL DEFAULT 0, net INTEGER NOT NULL, vat INTEGER NOT NULL, gross INTEGER NOT NULL,
  notional_vat INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS invoice_lines (
  id INTEGER PRIMARY KEY, invoice_id INTEGER NOT NULL REFERENCES invoices(id), sort INTEGER NOT NULL,
  description TEXT NOT NULL, qty REAL NOT NULL, unit_price INTEGER NOT NULL, vat_rate REAL NOT NULL, source TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY, invoice_id INTEGER NOT NULL REFERENCES invoices(id), amount INTEGER NOT NULL,
  date TEXT NOT NULL, method TEXT NOT NULL, reference TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY, date TEXT NOT NULL, payee TEXT NOT NULL, description TEXT, category TEXT NOT NULL DEFAULT 'materials',
  net INTEGER NOT NULL, vat INTEGER NOT NULL, job_id INTEGER REFERENCES jobs(id), created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY, type TEXT NOT NULL, number TEXT NOT NULL UNIQUE, template_version TEXT NOT NULL,
  client_id INTEGER NOT NULL REFERENCES clients(id), property_id INTEGER NOT NULL REFERENCES properties(id),
  asset_id INTEGER REFERENCES assets(id), job_id INTEGER REFERENCES jobs(id),
  issue_date TEXT NOT NULL, next_due TEXT, kept_deadline INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL, signature TEXT, pdf_path TEXT,
  notification_ref TEXT, notification_date TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_props_client ON properties(client_id);
CREATE INDEX IF NOT EXISTS idx_assets_prop ON assets(property_id);
CREATE INDEX IF NOT EXISTS idx_jobs_client ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_certs_prop ON certificates(property_id);
`;

const TEMPLATE_VERSIONS = { lgsr: 'LGSR-2026.1', service: 'SVC-2026.1', warning: 'WN-2026.1', commissioning: 'COM-2026.1' };
const CERT_PREFIX = { lgsr: 'LGSR', service: 'SVC', warning: 'WN', commissioning: 'COM' };
const now = () => new Date().toISOString();

function open(file) {
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  return createApi(db);
}

function createApi(db) {
  // node:sqlite will not bind undefined, so it becomes NULL here.
  const bind = p => p.map(v => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));
  const one = (sql, ...p) => db.prepare(sql).get(...bind(p)) || null;
  const all = (sql, ...p) => db.prepare(sql).all(...bind(p));
  const run = (sql, ...p) => db.prepare(sql).run(...bind(p));
  const tx = fn => { db.exec('BEGIN'); try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } };
  const nextSeq = (name) => {
    const row = one('SELECT value FROM seq WHERE name = ?', name);
    const v = (row ? row.value : 0) + 1;
    run('INSERT INTO seq (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value', name, v);
    return v;
  };
  const clean = v => (v === undefined ? null : v);
  const bool = v => (v ? 1 : 0);

  // ---------- account and business ----------
  function getAccount() {
    const a = one('SELECT * FROM account WHERE id = 1');
    if (a) a.trades = JSON.parse(a.trades || '[]');
    return a;
  }
  function createAccount(d) {
    if (getAccount()) throw new Error('An account already exists on this computer.');
    const trades = (d.trades || []).filter(t => ['gas', 'plumbing', 'electrical', 'building'].includes(t));
    if (!trades.length) throw new Error('Pick at least one trade.');
    const key = 'TPMS-' + Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, 'X')).join('-');
    run(`INSERT INTO account (id, owner_name, email, phone, business_name, address_line1, town, postcode, country, trades, plan, licence_key, created_at)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'trial', ?, ?)`,
      d.owner_name, d.email, d.phone, d.business_name, d.address_line1, d.town, d.postcode, d.country, JSON.stringify(trades), key, now());
    const biz = { trading_name: d.business_name, address_line1: d.address_line1, town: d.town, postcode: d.postcode, phone: d.phone, email: d.email, payment_terms_days: 14, engineer_name: d.owner_name };
    run('INSERT INTO business (id, data, wizard_done) VALUES (1, ?, 0)', JSON.stringify(biz));
    return getAccount();
  }
  function setTrades(trades) {
    const t = (trades || []).filter(x => ['gas', 'plumbing', 'electrical', 'building'].includes(x));
    if (!t.length) throw new Error('Keep at least one trade.');
    run('UPDATE account SET trades = ? WHERE id = 1', JSON.stringify(t));
    return getAccount();
  }
  function getBusiness() {
    const b = one('SELECT * FROM business WHERE id = 1');
    if (!b) return null;
    const data = JSON.parse(b.data || '{}');
    return { ...data, wizard_done: !!b.wizard_done, mtd: R.mtdIncomeTaxStart(data.structure, data.income_2425, data.income_2526) };
  }
  function saveBusiness(patch) {
    const b = one('SELECT data FROM business WHERE id = 1');
    const data = { ...JSON.parse(b.data || '{}'), ...patch };
    delete data.wizard_done; delete data.mtd;
    run('UPDATE business SET data = ? WHERE id = 1', JSON.stringify(data));
    return getBusiness();
  }
  function completeWizard() {
    const b = getBusiness();
    const missing = [];
    if (!b.trading_name) missing.push('trading name');
    if (!b.address_line1 || !b.postcode) missing.push('business address');
    if (!b.structure) missing.push('business structure');
    if (b.vat_registered === undefined || b.vat_registered === null || b.vat_registered === '') missing.push('VAT registration');
    if (b.vat_registered && (!b.vat_number || !b.vat_reg_date || !b.vat_scheme)) missing.push('VAT number, date and scheme');
    const trades = getAccount().trades;
    if (trades.includes('gas') && !b.gas_safe_reg) missing.push('Gas Safe registration number');
    if (trades.includes('plumbing') && !b.plumbing_scheme_no) missing.push('plumbing scheme membership number');
    if (trades.includes('electrical') && !b.electrical_scheme_no) missing.push('electrical scheme membership number');
    if (trades.includes('building') && !b.cis_role) missing.push('CIS role');
    if (missing.length) throw new Error('Still needed: ' + missing.join(', ') + '.');
    run('UPDATE business SET wizard_done = 1 WHERE id = 1');
    return getBusiness();
  }
  const vatOn = () => !!getBusiness()?.vat_registered;

  // ---------- clients, properties, appliances ----------
  function listClients(q) {
    const like = `%${(q || '').trim()}%`;
    return all(`SELECT c.*, (SELECT COUNT(*) FROM properties p WHERE p.client_id = c.id) AS property_count,
                (SELECT COUNT(*) FROM jobs j WHERE j.client_id = c.id) AS job_count
                FROM clients c WHERE c.name LIKE ? OR IFNULL(c.postcode,'') LIKE ? OR IFNULL(c.email,'') LIKE ?
                ORDER BY c.name COLLATE NOCASE`, like, like, like);
  }
  function getClient(id) {
    const c = one('SELECT * FROM clients WHERE id = ?', id);
    if (!c) return null;
    c.properties = all('SELECT * FROM properties WHERE client_id = ? ORDER BY id', id);
    for (const p of c.properties) p.assets = all('SELECT * FROM assets WHERE property_id = ? ORDER BY id', p.id);
    c.jobs = all('SELECT * FROM jobs WHERE client_id = ? ORDER BY id DESC', id).map(j => ({ ...j, total: jobTotals(j.id) }));
    c.certificates = all('SELECT id, type, number, issue_date, next_due, property_id FROM certificates WHERE client_id = ? ORDER BY issue_date DESC, id DESC', id);
    return c;
  }
  function saveClient(d) {
    if (!d.name || !String(d.name).trim()) throw new Error('Enter the client name.');
    const vals = [d.name.trim(), d.type || 'homeowner', clean(d.email), clean(d.phone), clean(d.address_line1), clean(d.address_line2), clean(d.town),
      d.postcode ? R.normalisePostcode(d.postcode) : null, bool(d.vat_registered), bool(d.cis_contractor), bool(d.end_user_notice), clean(d.notes)];
    if (d.id) {
      run(`UPDATE clients SET name=?, type=?, email=?, phone=?, address_line1=?, address_line2=?, town=?, postcode=?, vat_registered=?, cis_contractor=?, end_user_notice=?, notes=? WHERE id=?`, ...vals, d.id);
      return getClient(d.id);
    }
    const r = run(`INSERT INTO clients (name, type, email, phone, address_line1, address_line2, town, postcode, vat_registered, cis_contractor, end_user_notice, notes, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, ...vals, now());
    return getClient(Number(r.lastInsertRowid));
  }
  function getProperty(id) {
    const p = one('SELECT * FROM properties WHERE id = ?', id);
    if (p) p.assets = all('SELECT * FROM assets WHERE property_id = ? ORDER BY id', id);
    return p;
  }
  function saveProperty(d) {
    if (!d.address_line1) throw new Error('Enter the first line of the address.');
    if (!d.postcode) throw new Error('Enter the postcode.');
    const vals = [d.address_line1, clean(d.address_line2), clean(d.town), R.normalisePostcode(d.postcode), d.tenure || 'owner_occupied',
      clean(d.occupier_name), clean(d.occupier_phone), clean(d.occupier_email)];
    if (d.id) {
      run('UPDATE properties SET address_line1=?, address_line2=?, town=?, postcode=?, tenure=?, occupier_name=?, occupier_phone=?, occupier_email=? WHERE id=?', ...vals, d.id);
      return getProperty(d.id);
    }
    const r = run('INSERT INTO properties (client_id, address_line1, address_line2, town, postcode, tenure, occupier_name, occupier_phone, occupier_email) VALUES (?,?,?,?,?,?,?,?,?)', d.client_id, ...vals);
    return getProperty(Number(r.lastInsertRowid));
  }
  function saveAsset(d) {
    if (!d.appliance_type) throw new Error('Pick the appliance type.');
    const vals = [d.appliance_type, clean(d.make), clean(d.model), clean(d.location), clean(d.flue_type), clean(d.serial), clean(d.install_date), d.landlord_owned === false || d.landlord_owned === 0 ? 0 : 1];
    if (d.id) {
      run('UPDATE assets SET appliance_type=?, make=?, model=?, location=?, flue_type=?, serial=?, install_date=?, landlord_owned=? WHERE id=?', ...vals, d.id);
      return one('SELECT * FROM assets WHERE id = ?', d.id);
    }
    const r = run('INSERT INTO assets (property_id, kind, appliance_type, make, model, location, flue_type, serial, install_date, landlord_owned) VALUES (?, \'gas_appliance\', ?,?,?,?,?,?,?,?)', d.property_id, ...vals);
    return one('SELECT * FROM assets WHERE id = ?', Number(r.lastInsertRowid));
  }

  // ---------- jobs, estimates, variations ----------
  function revisionLines(revId) { return all('SELECT * FROM estimate_lines WHERE revision_id = ? ORDER BY sort', revId); }
  function revisionTotals(revId) { return R.totals(revisionLines(revId), { vatRegistered: vatOn() }); }
  function jobTotals(jobId) {
    const job = one('SELECT * FROM jobs WHERE id = ?', jobId);
    const vr = vatOn();
    const accepted = job.accepted_revision_id ? revisionTotals(job.accepted_revision_id) : null;
    const vars = all('SELECT * FROM variations WHERE job_id = ?', jobId);
    const sum = (list, sign) => R.totals(list.map(v => ({ ...v, sign })), { vatRegistered: vr });
    const extras = sum(vars.filter(v => v.kind === 'extra' && v.status === 'approved'), 1);
    const omissions = sum(vars.filter(v => v.kind === 'omission' && v.status === 'approved'), 1);
    const pending = sum(vars.filter(v => v.status === 'pending' && v.kind === 'extra'), 1);
    const base = accepted ? accepted.gross : 0;
    return {
      accepted: accepted ? accepted.gross : null, acceptedNet: accepted ? accepted.net : null,
      extras: extras.gross, omissions: omissions.gross, pendingExtras: pending.gross,
      total: base + extras.gross - omissions.gross,
      totalNet: (accepted ? accepted.net : 0) + extras.net - omissions.net,
    };
  }
  function listJobs(filter) {
    const rows = all(`SELECT j.*, c.name AS client_name, p.address_line1 AS property_line1, p.postcode AS property_postcode
                      FROM jobs j JOIN clients c ON c.id = j.client_id LEFT JOIN properties p ON p.id = j.property_id ORDER BY j.id DESC`);
    const out = rows.map(j => ({ ...j, totals: jobTotals(j.id), latest_revision: one('SELECT number, status FROM estimate_revisions WHERE job_id = ? ORDER BY number DESC LIMIT 1', j.id) }));
    return filter && filter !== 'all' ? out.filter(j => j.status === filter) : out;
  }
  function createJob(d) {
    if (!d.client_id) throw new Error('Pick a client.');
    if (!d.title || !d.title.trim()) throw new Error('Give the job a short title.');
    const ref = 'J-' + (1000 + nextSeq('job'));
    const r = run('INSERT INTO jobs (ref, client_id, property_id, title, status, created_at) VALUES (?,?,?,?,\'enquiry\',?)', ref, d.client_id, clean(d.property_id), d.title.trim(), now());
    return getJob(Number(r.lastInsertRowid));
  }
  function getJob(id) {
    const j = one('SELECT * FROM jobs WHERE id = ?', id);
    if (!j) return null;
    j.client = one('SELECT * FROM clients WHERE id = ?', j.client_id);
    j.property = j.property_id ? getProperty(j.property_id) : null;
    j.revisions = all('SELECT * FROM estimate_revisions WHERE job_id = ? ORDER BY number', id).map(r => ({
      ...r, lines: revisionLines(r.id), totals: revisionTotals(r.id),
      acceptance: one('SELECT * FROM acceptances WHERE revision_id = ?', r.id),
    }));
    j.variations = all('SELECT * FROM variations WHERE job_id = ? ORDER BY id', id).map(v => ({ ...v, totals: R.totals([v], { vatRegistered: vatOn() }) }));
    j.invoices = all('SELECT * FROM invoices WHERE job_id = ? ORDER BY id', id).map(i => withPayments(i));
    j.certificates = all('SELECT id, type, number, issue_date, next_due FROM certificates WHERE job_id = ? ORDER BY id', id);
    j.totals = jobTotals(id);
    j.reverse_charge = R.reverseChargeApplies(j.client);
    return j;
  }
  function saveRevision(jobId, lines, changeNote) {
    const job = one('SELECT * FROM jobs WHERE id = ?', jobId);
    if (job.accepted_revision_id) throw new Error('This estimate has been accepted. Add changes as variations instead.');
    const kept = (lines || []).filter(l => l.description && String(l.description).trim());
    if (!kept.length) throw new Error('Add at least one line with a description.');
    for (const l of kept) {
      if (!(Number(l.qty) > 0)) throw new Error(`Quantity must be more than 0 on “${l.description}”.`);
      if (!Number.isFinite(Number(l.unit_price))) throw new Error(`Check the price on “${l.description}”.`);
    }
    const prev = one('SELECT MAX(number) AS n FROM estimate_revisions WHERE job_id = ?', jobId).n || 0;
    if (prev > 0 && !(changeNote && changeNote.trim())) throw new Error('Say what changed in this version.');
    return tx(() => {
      run("UPDATE estimate_revisions SET status = 'superseded' WHERE job_id = ? AND status IN ('draft','sent')", jobId);
      const r = run('INSERT INTO estimate_revisions (job_id, number, status, change_note, created_at) VALUES (?,?,\'draft\',?,?)', jobId, prev + 1, prev ? changeNote.trim() : (changeNote || 'First version').trim(), now());
      const revId = Number(r.lastInsertRowid);
      const vr = vatOn();
      kept.forEach((l, i) => run('INSERT INTO estimate_lines (revision_id, sort, description, qty, unit_price, vat_rate, kind, supplier, sku, url) VALUES (?,?,?,?,?,?,?,?,?,?)',
        revId, i, l.description.trim(), Number(l.qty), Math.round(Number(l.unit_price)), vr ? Number(l.vat_rate ?? 20) : 0, l.kind || 'material', l.supplier || null, l.sku || null, l.url || null));
      run("UPDATE jobs SET status = 'estimating' WHERE id = ? AND status = 'enquiry'", jobId);
      return getJob(jobId);
    });
  }
  function markRevisionSent(revId) {
    const rev = one('SELECT * FROM estimate_revisions WHERE id = ?', revId);
    if (rev.status === 'draft') run("UPDATE estimate_revisions SET status = 'sent', sent_at = ? WHERE id = ?", now(), revId);
    run("UPDATE jobs SET status = 'estimate_sent' WHERE id = ? AND status IN ('enquiry','estimating')", rev.job_id);
    return getJob(rev.job_id);
  }
  function acceptRevision(revId, d) {
    const rev = one('SELECT * FROM estimate_revisions WHERE id = ?', revId);
    const job = one('SELECT * FROM jobs WHERE id = ?', rev.job_id);
    if (job.accepted_revision_id) throw new Error('An estimate version is already accepted for this job.');
    const latest = one('SELECT MAX(number) AS n FROM estimate_revisions WHERE job_id = ?', rev.job_id).n;
    if (rev.number !== latest) throw new Error('Only the latest version can be accepted.');
    if (!d.name || !d.name.trim()) throw new Error('Enter the name of the person accepting.');
    if (d.method === 'signed' && !d.signature) throw new Error('Ask the client to sign in the box.');
    const at = now();
    return tx(() => {
      run('INSERT INTO acceptances (revision_id, name, method, signature, accepted_at) VALUES (?,?,?,?,?)', revId, d.name.trim(), d.method, d.signature || null, at);
      run("UPDATE estimate_revisions SET status = 'accepted', accepted_at = ? WHERE id = ?", at, revId);
      run("UPDATE estimate_revisions SET status = 'superseded' WHERE job_id = ? AND id != ?", rev.job_id, revId);
      run("UPDATE jobs SET accepted_revision_id = ?, status = 'accepted' WHERE id = ?", revId, rev.job_id);
      return getJob(rev.job_id);
    });
  }
  function jobInvoiced(jobId) { return !!one("SELECT id FROM invoices WHERE job_id = ? AND status != 'void'", jobId); }
  function addVariation(d) {
    const job = one('SELECT * FROM jobs WHERE id = ?', d.job_id);
    if (!job.accepted_revision_id) throw new Error('Variations start once an estimate is accepted.');
    if (jobInvoiced(d.job_id)) throw new Error('This job has been invoiced.');
    if (!d.description || !d.description.trim()) throw new Error('Describe the change.');
    if (!(Number(d.qty) > 0)) throw new Error('Quantity must be more than 0.');
    if (!(Number(d.unit_price) >= 0)) throw new Error('Check the price.');
    run('INSERT INTO variations (job_id, kind, description, category, qty, unit_price, vat_rate, status, created_at) VALUES (?,?,?,?,?,?,?,\'pending\',?)',
      d.job_id, d.kind === 'omission' ? 'omission' : 'extra', d.description.trim(), d.category || 'material', Number(d.qty), Math.round(Number(d.unit_price)), vatOn() ? Number(d.vat_rate ?? 20) : 0, now());
    run("UPDATE jobs SET status = 'in_progress' WHERE id = ? AND status = 'accepted'", d.job_id);
    return getJob(d.job_id);
  }
  function decideVariation(id, decision, d = {}) {
    const v = one('SELECT * FROM variations WHERE id = ?', id);
    if (jobInvoiced(v.job_id)) throw new Error('This job has been invoiced.');
    if (decision === 'approve') {
      if (!d.by || !d.by.trim()) throw new Error('Enter who approved it.');
      run("UPDATE variations SET status = 'approved', approved_by = ?, approved_method = ?, decided_at = ? WHERE id = ?", d.by.trim(), d.method || 'in_person', now(), id);
    } else if (decision === 'reject') {
      run("UPDATE variations SET status = 'rejected', decided_at = ? WHERE id = ?", now(), id);
    } else if (decision === 'delete') {
      if (v.status !== 'pending') throw new Error('Only pending variations can be deleted.');
      run('DELETE FROM variations WHERE id = ?', id);
    }
    return getJob(v.job_id);
  }
  function setJobStatus(id, status) {
    if (!['in_progress', 'complete', 'cancelled'].includes(status)) throw new Error('Unknown status.');
    run('UPDATE jobs SET status = ?, completed_at = CASE WHEN ? = \'complete\' THEN ? ELSE completed_at END WHERE id = ?', status, status, now(), id);
    return getJob(id);
  }

  // ---------- invoices and payments ----------
  function withPayments(inv) {
    const pays = all('SELECT * FROM payments WHERE invoice_id = ? ORDER BY date, id', inv.id);
    const paid = pays.reduce((s, p) => s + p.amount, 0);
    return { ...inv, payments: pays, paid, balance: inv.gross - paid };
  }
  function createInvoiceFromJob(jobId, d = {}) {
    const job = getJob(jobId);
    if (!job.accepted_revision_id) throw new Error('Accept an estimate before invoicing.');
    if (jobInvoiced(jobId)) throw new Error('This job already has an invoice.');
    if (job.variations.some(v => v.status === 'pending')) throw new Error('Approve or reject the pending variations first.');
    const b = getBusiness();
    const accepted = job.revisions.find(r => r.id === job.accepted_revision_id);
    const lines = [
      ...accepted.lines.map(l => ({ description: l.description, qty: l.qty, unit_price: l.unit_price, vat_rate: l.vat_rate, source: `estimate v${accepted.number}` })),
      ...job.variations.filter(v => v.status === 'approved').map(v => ({
        description: (v.kind === 'omission' ? 'Omitted: ' : 'Extra: ') + v.description, qty: v.qty,
        unit_price: v.kind === 'omission' ? -v.unit_price : v.unit_price, vat_rate: v.vat_rate, source: `variation ${v.id}`,
      })),
    ];
    const rc = !!(b.vat_registered && job.reverse_charge);
    const t = R.totals(lines, { vatRegistered: !!b.vat_registered, reverseCharge: rc });
    const issue = d.issue_date || R.today();
    const terms = b.payment_terms_days === undefined || b.payment_terms_days === null || b.payment_terms_days === '' ? 14 : Number(b.payment_terms_days);
    const due = R.addDays(issue, terms);
    const number = 'INV-' + String(nextSeq('invoice')).padStart(4, '0');
    return tx(() => {
      const r = run('INSERT INTO invoices (job_id, number, issue_date, due_date, status, reverse_charge, net, vat, gross, notional_vat, created_at) VALUES (?,?,?,?,\'issued\',?,?,?,?,?,?)',
        jobId, number, issue, due, bool(rc), t.net, t.vat, t.gross, t.notionalVat, now());
      const invId = Number(r.lastInsertRowid);
      lines.forEach((l, i) => run('INSERT INTO invoice_lines (invoice_id, sort, description, qty, unit_price, vat_rate, source) VALUES (?,?,?,?,?,?,?)', invId, i, l.description, l.qty, l.unit_price, b.vat_registered ? l.vat_rate : 0, l.source));
      run("UPDATE jobs SET status = 'invoiced' WHERE id = ?", jobId);
      return getInvoice(invId);
    });
  }
  function getInvoice(id) {
    const inv = one('SELECT * FROM invoices WHERE id = ?', id);
    if (!inv) return null;
    const full = withPayments(inv);
    full.lines = all('SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY sort', id);
    full.job = one('SELECT * FROM jobs WHERE id = ?', inv.job_id);
    full.client = one('SELECT * FROM clients WHERE id = ?', full.job.client_id);
    full.property = full.job.property_id ? one('SELECT * FROM properties WHERE id = ?', full.job.property_id) : null;
    full.byRate = R.totals(full.lines, { vatRegistered: true, reverseCharge: !!inv.reverse_charge }).byRate;
    return full;
  }
  function listInvoices() {
    return all(`SELECT i.*, j.ref AS job_ref, c.name AS client_name FROM invoices i JOIN jobs j ON j.id = i.job_id JOIN clients c ON c.id = j.client_id ORDER BY i.id DESC`).map(withPayments);
  }
  function addPayment(invoiceId, d) {
    const inv = withPayments(one('SELECT * FROM invoices WHERE id = ?', invoiceId));
    const amount = Math.round(Number(d.amount));
    if (!(amount > 0)) throw new Error('Enter the amount received.');
    if (amount > inv.balance) throw new Error(`That is more than the £${(inv.balance / 100).toFixed(2)} still owed.`);
    if (!d.date) throw new Error('Enter the date it was received.');
    run('INSERT INTO payments (invoice_id, amount, date, method, reference, created_at) VALUES (?,?,?,?,?,?)', invoiceId, amount, d.date, d.method || 'transfer', clean(d.reference), now());
    const after = withPayments(one('SELECT * FROM invoices WHERE id = ?', invoiceId));
    const status = after.balance === 0 ? 'paid' : 'part_paid';
    run('UPDATE invoices SET status = ? WHERE id = ?', status, invoiceId);
    if (status === 'paid') run("UPDATE jobs SET status = 'paid' WHERE id = ?", inv.job_id);
    return getInvoice(invoiceId);
  }

  // ---------- expenses ----------
  function listExpenses(range) {
    if (range && range.start) return all('SELECT e.*, j.ref AS job_ref FROM expenses e LEFT JOIN jobs j ON j.id = e.job_id WHERE e.date BETWEEN ? AND ? ORDER BY e.date DESC, e.id DESC', range.start, range.end);
    return all('SELECT e.*, j.ref AS job_ref FROM expenses e LEFT JOIN jobs j ON j.id = e.job_id ORDER BY e.date DESC, e.id DESC');
  }
  function saveExpense(d) {
    if (!d.date) throw new Error('Enter the date paid.');
    if (!d.payee || !d.payee.trim()) throw new Error('Enter who you paid.');
    const net = Math.round(Number(d.net)), vat = Math.round(Number(d.vat || 0));
    if (!(net > 0)) throw new Error('Enter the amount before VAT.');
    if (vat < 0) throw new Error('VAT cannot be negative.');
    run('INSERT INTO expenses (date, payee, description, category, net, vat, job_id, created_at) VALUES (?,?,?,?,?,?,?,?)', d.date, d.payee.trim(), clean(d.description), d.category || 'materials', net, vat, clean(d.job_id), now());
    return true;
  }
  function deleteExpense(id) { run('DELETE FROM expenses WHERE id = ?', id); return true; }

  // ---------- certificates ----------
  function previousLgsrDue(propertyId) {
    const row = one("SELECT next_due FROM certificates WHERE type = 'lgsr' AND property_id = ? ORDER BY issue_date DESC, id DESC LIMIT 1", propertyId);
    return row ? row.next_due : null;
  }
  function previewNextDue(type, propertyId, issueDate) {
    if (type === 'lgsr') return R.lgsrNextDue(issueDate, previousLgsrDue(propertyId));
    if (type === 'service' || type === 'commissioning') return { date: R.serviceNextDue(issueDate), keptDeadline: false };
    return { date: null, keptDeadline: false };
  }
  function saveCertificate(d) {
    if (!TEMPLATE_VERSIONS[d.type]) throw new Error('Unknown certificate type.');
    if (!d.client_id || !d.property_id) throw new Error('Pick the client and property.');
    if (!d.issue_date) throw new Error('Enter the date of the check.');
    if (!d.signature) throw new Error('Sign the certificate before issuing it.');
    const data = d.data || {};
    if (d.type === 'lgsr' && !(data.appliances && data.appliances.length)) throw new Error('Add at least one appliance.');
    if ((d.type === 'service' || d.type === 'commissioning' || d.type === 'warning') && !d.asset_id && !(data.appliance && data.appliance.appliance_type)) throw new Error('Pick the appliance.');
    if (d.type === 'warning' && !data.classification) throw new Error('Pick Immediately Dangerous or At Risk.');
    const due = previewNextDue(d.type, d.property_id, d.issue_date);
    const number = `${CERT_PREFIX[d.type]}-${String(nextSeq('cert_' + d.type)).padStart(5, '0')}`;
    const r = run(`INSERT INTO certificates (type, number, template_version, client_id, property_id, asset_id, job_id, issue_date, next_due, kept_deadline, data, signature, notification_ref, notification_date, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      d.type, number, TEMPLATE_VERSIONS[d.type], d.client_id, d.property_id, clean(d.asset_id), clean(d.job_id), d.issue_date, due.date, bool(due.keptDeadline),
      JSON.stringify(data), d.signature, clean(data.notification_ref), clean(data.notification_date), now());
    return getCertificate(Number(r.lastInsertRowid));
  }
  function getCertificate(id) {
    const c = one('SELECT * FROM certificates WHERE id = ?', id);
    if (!c) return null;
    c.data = JSON.parse(c.data);
    c.client = one('SELECT * FROM clients WHERE id = ?', c.client_id);
    c.property = one('SELECT * FROM properties WHERE id = ?', c.property_id);
    c.asset = c.asset_id ? one('SELECT * FROM assets WHERE id = ?', c.asset_id) : null;
    c.job = c.job_id ? one('SELECT id, ref, title FROM jobs WHERE id = ?', c.job_id) : null;
    return c;
  }
  function listCertificates() {
    return all(`SELECT c.id, c.type, c.number, c.issue_date, c.next_due, c.pdf_path, c.notification_ref, cl.name AS client_name, p.address_line1, p.postcode
                FROM certificates c JOIN clients cl ON cl.id = c.client_id JOIN properties p ON p.id = c.property_id ORDER BY c.issue_date DESC, c.id DESC`);
  }
  // Gas warning notices already issued for a property, newest first, to link from a safety record.
  function listWarningNotices(propertyId) {
    return all("SELECT id, number, issue_date FROM certificates WHERE type = 'warning' AND property_id = ? ORDER BY issue_date DESC, id DESC", propertyId);
  }
  // Makes and models already used, so they can be picked again.
  function knownAppliances() {
    return all('SELECT DISTINCT make, model FROM assets WHERE make IS NOT NULL AND make != \'\' ORDER BY make, model');
  }
  function setCertificatePdf(id, path) { run('UPDATE certificates SET pdf_path = ? WHERE id = ?', path, id); return true; }
  function setNotification(id, ref, date) {
    if (!ref || !ref.trim()) throw new Error('Enter the notification reference.');
    run('UPDATE certificates SET notification_ref = ?, notification_date = ? WHERE id = ?', ref.trim(), date || R.today(), id);
    return getCertificate(id);
  }

  // Latest certificate per reminder key decides the due date.
  function dueList(onIso) {
    const on = onIso || R.today();
    const certs = all(`SELECT c.id, c.type, c.number, c.issue_date, c.next_due, c.property_id, c.asset_id, c.client_id,
                       cl.name AS client_name, cl.phone AS client_phone, cl.email AS client_email,
                       p.address_line1, p.postcode, p.tenure, p.occupier_name, p.occupier_phone,
                       a.appliance_type, a.make, a.location
                       FROM certificates c JOIN clients cl ON cl.id = c.client_id JOIN properties p ON p.id = c.property_id
                       LEFT JOIN assets a ON a.id = c.asset_id
                       WHERE c.next_due IS NOT NULL ORDER BY c.issue_date, c.id`);
    const latest = new Map();
    for (const c of certs) {
      const key = c.type === 'lgsr' ? `lgsr:${c.property_id}` : `service:${c.asset_id || 'p' + c.property_id}`;
      latest.set(key, c);
    }
    const out = [];
    for (const c of latest.values()) {
      const days = R.daysBetween(on, c.next_due);
      const bucket = R.reminderBucket(days);
      out.push({ ...c, kind: c.type === 'lgsr' ? 'Landlord gas safety check' : 'Annual service', days_left: days, bucket });
    }
    return out.sort((a, b) => a.next_due.localeCompare(b.next_due));
  }
  function notificationTracker(onIso) {
    const on = onIso || R.today();
    return all(`SELECT c.id, c.number, c.issue_date, c.notification_ref, cl.name AS client_name, p.address_line1, p.postcode
                FROM certificates c JOIN clients cl ON cl.id = c.client_id JOIN properties p ON p.id = c.property_id
                WHERE c.type = 'commissioning' AND (c.notification_ref IS NULL OR c.notification_ref = '') ORDER BY c.issue_date`)
      .map(c => { const deadline = R.gasSafeNotificationDeadline(c.issue_date); return { ...c, deadline, days_left: R.daysBetween(on, deadline) }; });
  }

  // ---------- VAT ----------
  function vatSummary(periodIndex) {
    const b = getBusiness();
    if (!b.vat_registered) return { registered: false };
    const periods = R.vatPeriods(b.vat_reg_date, b.vat_stagger || 1, R.today());
    if (!periods.length) return { registered: true, periods: [] };
    const idx = periodIndex === undefined || periodIndex === null ? periods.length - 1 : Math.max(0, Math.min(periods.length - 1, Number(periodIndex)));
    const period = periods[idx];
    const invoices = all("SELECT * FROM invoices WHERE status != 'void'");
    const payments = all('SELECT p.*, i.number AS inv_number FROM payments p JOIN invoices i ON i.id = p.invoice_id').map(p => ({ ...p, invoice: { ...one('SELECT * FROM invoices WHERE id = ?', p.invoice_id) } }));
    const expenses = all('SELECT * FROM expenses');
    const result = R.vatReturn({ scheme: b.vat_scheme, flatRatePct: b.flat_rate_pct, period, invoices, payments, expenses });
    return { registered: true, scheme: b.vat_scheme, flatRatePct: b.flat_rate_pct, periods, index: idx, period, ...result };
  }

  // ---------- dashboard ----------
  function dashboard() {
    const on = R.today();
    const b = getBusiness();
    const due = dueList(on).filter(d => d.bucket);
    const jobs = listJobs();
    const invoices = listInvoices().filter(i => i.balance > 0);
    let vat = null;
    if (b.vat_registered) {
      const s = vatSummary();
      if (s.period) vat = { period: s.period, boxes: s.boxes, direction: s.direction };
    }
    let mtd = null;
    if (b.mtd && b.mtd.date && (b.mtd.status === 'required')) {
      const q = R.nextMtdDeadline(b.mtd.date, on);
      if (q) mtd = q;
    }
    return {
      due, notifications: notificationTracker(on),
      awaitingAcceptance: jobs.filter(j => ['estimating', 'estimate_sent'].includes(j.status)),
      toInvoice: jobs.filter(j => ['accepted', 'in_progress', 'complete'].includes(j.status)),
      unpaid: invoices.map(i => ({ ...i, overdue: i.due_date < on })),
      vat, mtd, mtdInfo: b.mtd,
    };
  }

  return {
    getAccount, createAccount, setTrades, getBusiness, saveBusiness, completeWizard,
    listClients, getClient, saveClient, getProperty, saveProperty, saveAsset,
    listJobs, createJob, getJob, saveRevision, markRevisionSent, acceptRevision, addVariation, decideVariation, setJobStatus,
    createInvoiceFromJob, getInvoice, listInvoices, addPayment,
    listExpenses, saveExpense, deleteExpense,
    previewNextDue, saveCertificate, getCertificate, listCertificates, listWarningNotices, knownAppliances, setCertificatePdf, setNotification, dueList, notificationTracker,
    vatSummary, dashboard,
    mtdPreview: (s, a, b) => R.mtdIncomeTaxStart(s, a, b),
    _db: db,
  };
}

module.exports = { open };
