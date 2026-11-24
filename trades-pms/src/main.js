'use strict';
const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { open } = require('./db');
const R = require('./rules');
const docs = require('./docs');

if (!app.requestSingleInstanceLock()) { app.quit(); }
// UK dates in date pickers, whatever the system language.
app.commandLine.appendSwitch('lang', 'en-GB');

let db, win;
const dataDir = () => process.env.TPMS_DATA_DIR || app.getPath('userData');
const docsDir = () => process.env.TPMS_DOCS_DIR || path.join(app.getPath('documents'), 'Trades PMS');

function createWindow() {
  win = new BrowserWindow({
    width: 1380, height: 880, minWidth: 1100, minHeight: 700,
    title: 'Trades PMS', backgroundColor: '#F4F6F5', autoHideMenuBar: true, show: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) { e.preventDefault(); if (/^https?:\/\//i.test(url)) shell.openExternal(url); } });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

app.whenReady().then(() => {
  fs.mkdirSync(dataDir(), { recursive: true });
  db = open(path.join(dataDir(), 'trades-pms.db'));

  // Every database call from the window goes through this one channel.
  ipcMain.handle('api', (_e, method, args) => {
    if (method.startsWith('_') || typeof db[method] !== 'function') return { error: `Unknown action: ${method}` };
    try { return { ok: db[method](...(args || [])) }; }
    catch (err) { return { error: err.message }; }
  });

  ipcMain.handle('postcode:check', async (_e, pc) => {
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
  });

  ipcMain.handle('doc:pdf', async (_e, kind, id, opts = {}) => {
    try {
      const business = db.getBusiness();
      const account = db.getAccount();
      let html, out;
      if (kind === 'estimate') {
        const job = db.getJob(id.job);
        const rev = job.revisions.find(r => r.id === id.revision);
        html = docs.estimateHtml({ job, rev, business, account });
        out = path.join(docsDir(), 'Estimates', `${job.ref} estimate v${rev.number}.pdf`);
      } else if (kind === 'invoice') {
        const inv = db.getInvoice(id);
        html = docs.invoiceHtml({ inv, business, account });
        out = path.join(docsDir(), 'Invoices', `${inv.number}.pdf`);
      } else if (kind === 'certificate') {
        const cert = db.getCertificate(id);
        html = docs.certificateHtml({ cert, business, account });
        out = path.join(docsDir(), 'Certificates', `${cert.number}.pdf`);
      } else return { error: 'Unknown document.' };
      await renderPdf(html, out);
      if (kind === 'certificate') db.setCertificatePdf(id, out);
      if (opts.open !== false) shell.openPath(out);
      return { ok: out };
    } catch (err) { return { error: err.message }; }
  });

  ipcMain.handle('file:saveText', async (_e, defaultName, content) => {
    const r = await dialog.showSaveDialog(win, { defaultPath: path.join(docsDir(), defaultName), filters: [{ name: 'CSV', extensions: ['csv'] }] });
    if (r.canceled || !r.filePath) return { ok: null };
    fs.mkdirSync(path.dirname(r.filePath), { recursive: true });
    fs.writeFileSync(r.filePath, '﻿' + content, 'utf8');
    return { ok: r.filePath };
  });
  ipcMain.handle('shell:openPath', (_e, p) => shell.openPath(p));
  ipcMain.handle('shell:showItem', (_e, p) => { shell.showItemInFolder(p); return true; });
  ipcMain.handle('app:info', () => ({ version: app.getVersion(), dataDir: dataDir(), docsDir: docsDir() }));

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

async function renderPdf(html, outPath) {
  const tmp = path.join(os.tmpdir(), `tpms-${process.pid}-${Date.now()}.html`);
  fs.writeFileSync(tmp, html, 'utf8');
  const pdfWin = new BrowserWindow({ show: false, webPreferences: { sandbox: true, javascript: false } });
  try {
    await pdfWin.loadFile(tmp);
    const pdf = await pdfWin.webContents.printToPDF({
      pageSize: 'A4', printBackground: true,
      margins: { marginType: 'custom', top: 0.45, bottom: 0.6, left: 0.5, right: 0.5 },
      displayHeaderFooter: true, headerTemplate: '<span></span>',
      footerTemplate: '<div style="font-size:7px;width:100%;padding:0 0.5in;color:#5A6774;font-family:sans-serif;text-align:right">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    });
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, pdf);
  } finally {
    pdfWin.destroy();
    fs.rmSync(tmp, { force: true });
  }
}
