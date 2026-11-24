# Trades PMS

Desktop practice management for gas, plumbing, electrical and building trades in England and Wales. Phase 1: core plus gas.

## Run it

```
npm install
npm start
```

The first launch asks you to create an account (business details, postcode check, trades), then runs the setup wizard.

## Check the calculations

```
npm test
```

The tests cover estimate versions, variations, invoice totals, VAT boxes under the standard, cash and flat rate schemes, MTD start dates, gas certificate due dates and the England and Wales postcode check.

## Where things are kept

- Database: `%APPDATA%\trades-pms\trades-pms.db` (one SQLite file per installation, never shared).
- PDFs and exports: `Documents\Trades PMS\` (Estimates, Invoices, Certificates).

Delete the database file to start again from account creation.

## Layout

- `src/main.js` Electron window, PDF rendering, file saving
- `src/db.js` database schema and every read and write
- `src/rules.js` every calculation: totals, VAT, due dates, MTD, postcode region
- `src/docs.js` PDF layouts for estimates, invoices and certificates
- `src/renderer/` the screens
- `test/rules.test.js` the calculation tests

The database uses Node's built-in SQLite, so nothing needs compiling.

## On the web

The same app runs in a browser at `reaction.org.uk/demos/trades-pms`, behind the Reaction sign-in. It is this folder, served as it is: the screens, `src/db.js`, `src/rules.js` and `src/docs.js` are the files the desktop app runs, so a change to any of them changes both. Only the bridge underneath (`window.tpms`) is different.

| | Desktop | Web |
|---|---|---|
| Database | SQLite file in `%APPDATA%` | SQLite in the browser, saved to the signed-in login after every change |
| Bridge | `src/main.js` and `src/preload.js` | `web/boot.js` |
| PDFs | Printed by Electron, saved to Documents and opened | Printed by Chromium on the server with the same settings, downloaded under the same name |
| CSV exports | Save dialog | Browser download |

- `web/index.html` the page (the same shell as `src/renderer/index.html`)
- `web/boot.js` the bridge: loading and saving, PDFs, CSV downloads, postcode lookup
- `web/sqlite-adapter.js` makes sql.js look like Node's `node:sqlite` so `src/db.js` runs unchanged
- `web/vendor/` sql.js 1.17.0 (SQLite compiled to WebAssembly)

Each sign-in has its own data: one row in the `TradesPmsStore` table of the Reaction database holding that login's whole SQLite file. Every save carries the version it was based on, so if the same login is open in two places the later one is told to reload instead of overwriting.

The site side is in the parent repo: `app/demos/trades-pms/route.ts` (the page), `app/api/trades-pms/` (`asset` serves this folder to approved sign-ins, `store` loads and saves, `pdf` prints), `lib/tradesPms.ts` (who may open it, and the storage), `db/trades-pms.sql` (the table and the catalogue row).

Where a screen has to behave differently on the web it checks `window.tpms.web`, which only the web bridge sets. So far that is two places: the PDF toast in `src/renderer/ui.js` and the certificate header buttons in `src/renderer/views/certs.js`.

When adding to the app:

- a new action in `src/db.js` needs nothing extra on the web
- a new script in `src/renderer/index.html` must also be added to the list at the bottom of `web/boot.js`
- a new call on `window.tpms` must be added to both `src/preload.js` (with its handler in `src/main.js`) and `web/boot.js`
- a new Node module required by `src/db.js`, `src/rules.js` or `src/docs.js` must be given a browser stand-in in `web/boot.js`
