# Analytics dashboard — setup

A first-party, auth-gated analytics page at **`/analytics`**, restricted to one login.
It complements the existing Vercel Analytics (which stays in the Vercel dashboard) by
storing data you can query and chart in-app.

## What was added
| File | Purpose |
|---|---|
| `prisma/schema.prisma` | 3 new models: `PageView`, `DemoSession`, `AgentMetric` |
| `db/analytics.sql` | raw DDL to create those tables in Neon |
| `app/api/track/route.ts` | public, same-origin, fail-soft beacon endpoint |
| `components/SiteAnalytics.tsx` | client beacon (page views + demo time), mounted in layout |
| `app/layout.tsx` | renders `<SiteAnalytics />` |
| `app/analytics/page.tsx` | the auth-gated dashboard (SVG charts, no new deps) |

## What it tracks
- **Visitors & page views** — cookieless first-party id in `localStorage`, per route change. Excludes `/admin`, `/analytics`, `/api`, `/auth`.
- **Time spent on demos** — times any visit to `/portal` or `/demo-app/*` and flushes the duration when the visitor leaves (route change, tab hidden, or unload, via `navigator.sendBeacon`).
- **Demo requests** — read from your existing `DemoRequest` table.
- **Client agent metrics** — latest value per client from `AgentMetric` (you feed this).

## Deploy steps
1. **Create the tables.** Open your Neon SQL editor and run the whole of `db/analytics.sql`. (Raw SQL on purpose — this project does not use `prisma migrate` / `db push`.)

2. **Set the single login.** In Vercel → project → Settings → Environment Variables, add:
   ```
   ANALYTICS_EMAIL = the-one-email@you-choose.com
   ```
   Only a signed-in session whose email matches this can open `/analytics`.

3. **Deploy.** The build already runs `prisma generate`, so the new models are picked up automatically — no extra command.

4. **Sign in.** Go to `/auth/signin`, enter `ANALYTICS_EMAIL`, use the magic link. Then open `/analytics`. (Auth.js creates the user on first magic-link sign-in; no manual user row needed.)

## Feeding client agent metrics
The dashboard shows the latest value per `(client, metric)`. Insert from your agent pipelines or by hand:
```sql
INSERT INTO "AgentMetric" ("id","client","metric","value","unit")
VALUES (gen_random_uuid()::text, 'Southmoor Vets', 'hours_saved', 86, 'hours');
```
`metric` names with underscores render nicely (`hours_saved` → "hours saved").

## Notes
- The beacon is fire-and-forget and wrapped in try/catch — it can never block navigation or surface an error.
- Data is 30-day windowed on the dashboard; empty states show until traffic arrives.
- To widen access beyond one login later, change the gate in `app/analytics/page.tsx` (e.g. also allow `session.user.role === "ADMIN"`).

---

# Part 2 — figures for Reaction's own PMS (November 2026)

Reaction's own PMS has an **Analytics** tab that shows this site's figures. It fetches
them from one read-only address here, opened with a key. This part also fixes the demo
timer, records which mailing a visit came from and which buttons are pressed, leaves our
own visits out, and adds a Privacy page with a switch to turn counting off.

## What was added or changed
| File | Purpose |
|---|---|
| `db/analytics-2.sql` | adds `PageView.campaign` and the `SiteEvent` table |
| `lib/siteFigures.ts` | counts everything the PMS shows, as totals (raw SQL, fail-soft per section) |
| `app/api/analytics/summary/route.ts` | the keyed, read-only address: `GET /api/analytics/summary?days=7\|30\|90\|365` |
| `app/api/track/route.ts` | also takes a mailing tag and a button press; drops anything from a signed-in admin |
| `lib/visitCount.ts` | the browser's side in one place: its number, the off switch, sending |
| `components/SiteAnalytics.tsx` | times the demos where they live now (`/demos/<slug>`, `/articled`), reads `?m=` tags, records button presses |
| `public/demo-timer.js` + `app/demos/trades-pms/route.ts` | times Trades PMS, which is served as a page of its own |
| `components/VercelCount.tsx` + `app/layout.tsx` | Vercel's counter behind the same off switch |
| `app/privacy/page.tsx` + `components/CountingSwitch.tsx` + `components/SiteFooter.tsx` | the Privacy page, its switch, and the footer link to it |

## Deploy steps
1. **Run the SQL.** In the Neon SQL editor, run the whole of `db/analytics-2.sql`. Safe to run twice.
   (If the deploy happens first, nothing breaks: tags and button presses start being kept once it has run.)
2. **Set the key.** In the PMS: Settings → Company → Website → **Make the key**. Copy it, and in
   Vercel → project → Settings → Environment Variables add:
   ```
   ANALYTICS_KEY = the key the PMS showed
   ```
   Until this is set, `/api/analytics/summary` answers 404 as if it were not there.
3. **Deploy** (a new deployment is needed for Vercel to pick the variable up).
4. In the PMS, Settings → Company → Website → **Check the connection**.

## What is recorded now
- **Page views** as before, plus the tag of the mailing whose link brought the visitor (`?m=...`).
  The tag says which mailing, never which person.
- **Demo time** for `/demos/<slug>` and `/articled` pages, and for Trades PMS. A visit that is hidden
  and shown again is timed in parts; the parts add up.
- **Button presses**: anything with the class `btn`, email and phone links, and anything given a
  `data-track="Name"` attribute. What it said, where it led, which page it was on.
- **Not our own visits**: a signed-in admin is never counted. Anyone else on the team can switch
  counting off for their browser on `/privacy`.

## The key
The key only reads totals and the list of demo requests. It cannot change anything. To replace it,
make a new one in the PMS and change `ANALYTICS_KEY` in Vercel to match, then redeploy.
