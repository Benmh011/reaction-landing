// Trades PMS on the web.
//
// The screens in src/renderer talk to one object, window.tpms. On the desktop
// that object is Electron's bridge to src/main.js. Here it is rebuilt for the
// browser so the same screens, the same database code (src/db.js), the same
// rules (src/rules.js) and the same document layouts (src/docs.js) run
// unchanged:
//
//   desktop                              web
//   SQLite file in %APPDATA%             SQLite in memory, saved to the signed-in login
//   PDF printed by Electron to Documents the same HTML printed by Chromium on the server, downloaded
//   save dialog for CSV                  browser download
//
// Every change is saved straight away. Each save carries the version it was
// based on; if the login has been changed somewhere else in the meantime the
// save is refused and the user is asked to reload, so nothing is overwritten.

import { makeSqlite } from './sqlite-adapter.js';

const ROOT = '/demos/trades-pms/app';
const SRC = `${ROOT}/src`;
const API = '/api/trades-pms';
const SIGN_IN = `/auth/signin?callbackUrl=${encodeURIComponent('/demos/trades-pms')}`;

// ---------- status panel (loading, signed out, conflict, save trouble) ----------
const panel = document.getElementById('tpmsw-panel');
const banner = document.getElementById('tpmsw-banner');
function showPanel(title, text, actions = []) {
  panel.replaceChildren();
  const box = document.createElement('div');
  box.className = 'tpmsw-box';
  const h = document.createElement('h1');
  h.textContent = title;
  box.appendChild(h);
  if (text) { const p = document.createElement('p'); p.textContent = text; box.appendChild(p); }
  if (actions.length) {
    const row = document.createElement('div');
    row.className = 'tpmsw-actions';
    for (const [label, fn, primary] of actions) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = primary ? 'tpmsw-btn tpmsw-btn-primary' : 'tpmsw-btn';
      b.textContent = label;
      b.addEventListener('click', fn);
      row.appendChild(b);
    }
    box.appendChild(row);
  }
  panel.appendChild(box);
  panel.hidden = false;
}
const hidePanel = () => { panel.hidden = true; };
function showBanner(text) { banner.textContent = text; banner.hidden = !text; }

// ---------- gzip, where the browser has it ----------
const canGzip = typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';
async function pipe(bytes, stream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}
const gzip = (bytes) => pipe(bytes, new CompressionStream('gzip'));
const gunzip = (bytes) => pipe(bytes, new DecompressionStream('gzip'));

// ---------- the saved database for this login ----------
async function fetchStore() {
  const res = await fetch(`${API}/store`, { cache: 'no-store', credentials: 'same-origin' });
  if (res.status === 401) return { signedOut: true };
  if (res.status === 403) return { forbidden: true };
  if (res.status === 204) return { bytes: null, version: 0 };
  if (!res.ok) throw new Error(`The saved data could not be loaded (${res.status}).`);
  let bytes = new Uint8Array(await res.arrayBuffer());
  if (res.headers.get('x-tpms-encoding') === 'gzip') {
    if (!canGzip) throw new Error('This browser is too old to open the saved data. Use a current version of Chrome, Edge, Firefox or Safari.');
    bytes = await gunzip(bytes);
  }
  return { bytes, version: Number(res.headers.get('x-tpms-version') || 0) };
}

// ---------- CommonJS files, loaded as they are ----------
// src/db.js, src/rules.js and src/docs.js are written for Node (`require`,
// `module.exports`). Each is imported as a module script, so its top-level
// names stay private, with `require` and `module` supplied as globals for the
// moment it runs.
const registry = new Map();
async function loadCommonJs(name, url) {
  window.module = { exports: {} };
  window.exports = window.module.exports;
  await import(url);
  registry.set(name, window.module.exports);
  return window.module.exports;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`A part of the app did not load (${src.split('/').pop()}).`));
    document.body.appendChild(s);
  });
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function start() {
  showPanel('Trades PMS', 'Opening your account…');

  const store = await fetchStore();
  if (store.signedOut) { location.replace(SIGN_IN); return; }
  if (store.forbidden) { showPanel('Trades PMS', 'This account has not been given access to Trades PMS.', [['Back to Reaction', () => location.assign('/demo'), true]]); return; }

  // eslint-disable-next-line no-undef
  const SQL = await initSqlJs({ locateFile: (f) => `${ROOT}/web/vendor/${f}` });

  // ----- saving -----
  let version = store.version;
  let dirty = false;      // there are changes not yet sent
  let saving = false;     // a save is on its way
  let stopped = false;    // a conflict or sign-out: nothing more will be saved from this page
  let timer = 0;
  let retryIn = 0;

  const sqlite = makeSqlite(SQL, { initialBytes: store.bytes, onWrite: () => { dirty = true; } });

  function scheduleSave(delay = 400) {
    if (stopped || !dirty) return;
    clearTimeout(timer);
    timer = setTimeout(save, delay);
  }

  async function save() {
    if (stopped || saving || !dirty) return;
    saving = true;
    dirty = false;
    try {
      const raw = sqlite.exportBytes();
      const body = canGzip ? await gzip(raw) : raw;
      const res = await fetch(`${API}/store`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/octet-stream', 'x-tpms-base-version': String(version), 'x-tpms-encoding': canGzip ? 'gzip' : 'none' },
        body,
      });
      if (res.status === 409) {
        stopped = true;
        showBanner('');
        showPanel('This account was changed somewhere else',
          'It has been saved from another window or another device since this page was opened. Reload to carry on from the latest version. The last change made on this page was not saved.',
          [['Reload', () => { stopped = true; dirty = false; location.reload(); }, true]]);
        return;
      }
      if (res.status === 401) {
        dirty = true;
        stopped = true;
        showBanner('');
        showPanel('You have been signed out',
          'Sign in again in another tab, then come back here and choose Try again. Your latest change is still on this page and will be saved then.',
          [['Open sign in', () => window.open(SIGN_IN, '_blank', 'noopener')], ['Try again', () => { stopped = false; hidePanel(); scheduleSave(0); }, true]]);
        return;
      }
      if (res.status === 413) {
        dirty = true;
        stopped = true;
        showPanel('This account has grown too large to save', 'The saved data is over the size this service can store. Tell Reaction so the limit can be raised. Changes made from now on are not being saved.', [['Close', hidePanel, true]]);
        return;
      }
      if (!res.ok) throw new Error(`save failed (${res.status})`);
      version = (await res.json()).version;
      retryIn = 0;
      showBanner('');
    } catch {
      // offline, or the server stumbled: keep the change and try again
      dirty = true;
      retryIn = Math.min(retryIn ? retryIn * 2 : 2000, 30000);
      showBanner('Not saved yet. Trying again…');
      clearTimeout(timer);
      timer = setTimeout(save, retryIn);
    } finally {
      saving = false;
      if (dirty && !stopped && !retryIn) scheduleSave(200);
    }
  }

  window.addEventListener('beforeunload', (e) => {
    if ((dirty || saving) && !stopped) { e.preventDefault(); e.returnValue = ''; }
  });
  window.addEventListener('online', () => { if (dirty) scheduleSave(0); });

  // ----- the same files the desktop app runs -----
  window.require = (name) => {
    if (!registry.has(name)) throw new Error(`Module not available on the web: ${name}`);
    return registry.get(name);
  };
  window.__dirname = SRC; // docs.js builds its font addresses from this
  registry.set('node:sqlite', { DatabaseSync: sqlite.DatabaseSync });
  registry.set('node:path', { join: (...parts) => parts.join('/').replace(/\/{2,}/g, '/') });
  registry.set('node:url', { pathToFileURL: (p) => ({ href: location.origin + p }) });
  const R = await loadCommonJs('./rules', `${SRC}/rules.js`);
  await loadCommonJs('./shared/labels', `${SRC}/shared/labels.js`);
  const { open } = await loadCommonJs('./db', `${SRC}/db.js`);
  const docs = await loadCommonJs('./docs', `${SRC}/docs.js`);
  delete window.require;
  delete window.module;
  delete window.exports;

  const db = open('trades-pms.db');
  const copy = (v) => (v === undefined ? undefined : structuredClone(v)); // what Electron's IPC does to every value

  // ----- documents -----
  function buildDocument(kind, id) {
    const business = db.getBusiness();
    const account = db.getAccount();
    if (kind === 'estimate') {
      const job = db.getJob(id.job);
      const rev = job.revisions.find((r) => r.id === id.revision);
      return { html: docs.estimateHtml({ job, rev, business, account }), folder: 'Estimates', name: `${job.ref} estimate v${rev.number}.pdf` };
    }
    if (kind === 'invoice') {
      const inv = db.getInvoice(id);
      return { html: docs.invoiceHtml({ inv, business, account }), folder: 'Invoices', name: `${inv.number}.pdf` };
    }
    if (kind === 'certificate') {
      const cert = db.getCertificate(id);
      return { html: docs.certificateHtml({ cert, business, account }), folder: 'Certificates', name: `${cert.number}.pdf` };
    }
    return null;
  }

  async function renderPdf(html, name) {
    const res = await fetch(`${API}/pdf`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ html, filename: name }),
    });
    if (!res.ok) throw new Error(`The PDF could not be made (${res.status}).`);
    return await res.blob();
  }

  // If the server cannot make the PDF, the browser prints the same document
  // and the user saves it as a PDF from the print window.
  function printInBrowser(html) {
    return new Promise((resolve, reject) => {
      const frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
      frame.onload = () => {
        try {
          frame.contentWindow.focus();
          frame.contentWindow.print();
          setTimeout(() => frame.remove(), 60000);
          resolve();
        } catch (err) { frame.remove(); reject(err); }
      };
      frame.srcdoc = html;
      document.body.appendChild(frame);
    });
  }

  async function pdf(kind, id, opts = {}) {
    try {
      const doc = buildDocument(kind, id);
      if (!doc) return { error: 'Unknown document.' };
      const out = `${doc.folder}/${doc.name}`;
      if (kind === 'certificate') { db.setCertificatePdf(id, out); scheduleSave(); }
      // The desktop app writes the file to disk here even when it is not opened.
      // There is no disk on the web, so the PDF is made when it is asked for.
      if (opts.open === false) return { ok: out };
      try {
        download(await renderPdf(doc.html, doc.name), doc.name);
      } catch (err) {
        console.error(err);
        await printInBrowser(doc.html);
      }
      return { ok: out };
    } catch (err) { return { error: err.message }; }
  }

  // ----- the bridge the screens use -----
  window.tpms = {
    web: true,
    call: async (method, ...args) => {
      if (typeof method !== 'string' || method.startsWith('_') || typeof db[method] !== 'function') return { error: `Unknown action: ${method}` };
      try { return { ok: copy(db[method](...copy(args))) }; }
      catch (err) { return { error: err.message }; }
      finally { scheduleSave(); }
    },
    checkPostcode: async (pc) => {
      const byArea = R.postcodeRegionByArea(pc);
      if (!byArea.valid) return byArea;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(byArea.postcode)}`, { signal: ctrl.signal });
        clearTimeout(t);
        if (res.status === 404) return { ...byArea, valid: false, allowed: false, reason: 'That postcode was not found. Check it and try again.' };
        const body = await res.json();
        if (body && body.result && body.result.country) return { ...R.regionFromCountry(body.result.country, byArea.postcode), source: 'lookup' };
      } catch { /* offline: fall back to the postcode area rule */ }
      return { ...byArea, source: 'area' };
    },
    pdf,
    saveText: async (defaultName, content) => {
      download(new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' }), defaultName);
      return { ok: defaultName };
    },
    // Paths are folder/name pairs here, as returned by pdf().
    showItem: async (p) => {
      const number = String(p || '').split('/').pop().replace(/\.pdf$/i, '');
      const cert = db.listCertificates().find((c) => c.number === number);
      if (cert) await pdf('certificate', cert.id);
      return true;
    },
    openPath: async () => '',
    info: async () => ({ version: 'web', dataDir: 'Saved to your Reaction sign-in', docsDir: 'Your Downloads folder' }),
  };

  // Links to other sites open in a new tab, as they open in the browser from the desktop app.
  document.addEventListener('click', (e) => {
    const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (/^https?:\/\//i.test(href)) { e.preventDefault(); window.open(href, '_blank', 'noopener'); }
  }, true);

  // ----- the screens, in the order src/renderer/index.html loads them -----
  if (document.readyState === 'loading') await new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true }));
  for (const f of ['shared/labels.js', 'renderer/ui.js', 'renderer/views/setup.js', 'renderer/views/clients.js', 'renderer/views/jobs.js', 'renderer/views/certs.js', 'renderer/views/money.js', 'renderer/app.js']) {
    await loadScript(`${SRC}/${f}`);
  }
  hidePanel();
  // app.js starts on DOMContentLoaded, which has already happened by now.
  window.dispatchEvent(new Event('DOMContentLoaded'));
}

start().catch((err) => {
  console.error(err);
  showPanel('Trades PMS could not open', err && err.message ? err.message : 'Something went wrong.', [['Try again', () => location.reload(), true]]);
});
