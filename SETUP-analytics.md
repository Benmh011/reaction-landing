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
