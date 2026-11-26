// The site's own figures, as totals, for the keyed address /api/analytics/summary.
//
// Everything here is counted from the tables the site already fills (PageView,
// DemoSession, DemoRequest, Demo) plus the two things db/analytics-2.sql adds
// (the mailing tag on a page view, and SiteEvent for button presses). Raw SQL
// on purpose, like the rest of the analytics: the Prisma schema does not
// change, and a table or column that is not there yet costs one section of the
// answer, never the whole of it. What was missing is said in `notes`.
//
// A "visitor" is the anonymous number a browser keeps for this site
// (components/SiteAnalytics.tsx). No name, address or IP is in any of it. The
// one part that names people is the list of demo requests, which they sent us
// themselves through the form.
//
// Days are London days. A range of N days is today so far and the N-1 whole
// days before it; the "previous" figures are the N days before that.

import { prisma } from "@/lib/prisma";

export const RANGES = [7, 30, 90, 365] as const;
export type RangeDays = (typeof RANGES)[number];

type Row = Record<string, unknown>;
const n = (v: unknown): number => (typeof v === "bigint" ? Number(v) : Number(v ?? 0)) || 0;
const s = (v: unknown): string => (v == null ? "" : String(v));

// "createdAt" columns are timestamps without a zone, holding UTC.
const LONDON_DAY = `to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/London', 'YYYY-MM-DD')`;
/** The start of the range, as a UTC timestamp without a zone: midnight in London, `back` days before today. */
const start = (back: number) =>
  `((date_trunc('day', now() AT TIME ZONE 'Europe/London') - make_interval(days => ${Math.trunc(back)})) AT TIME ZONE 'Europe/London' AT TIME ZONE 'UTC')`;

const OWN_HOSTS = new Set(["reaction.org.uk", "localhost", "127.0.0.1"]);

export async function siteFigures(days: RangeDays, ownHost: string | null) {
  const notes: string[] = [];
  const since = start(days - 1);
  const prev = start(2 * days - 1);
  const q = async (label: string, sql: string): Promise<Row[]> => {
    try {
      return (await prisma.$queryRawUnsafe(sql)) as Row[];
    } catch (e) {
      notes.push(`${label}: not available (${String((e as Error)?.message ?? e).split("\n").pop()?.slice(0, 160)})`);
      return [];
    }
  };
  const own = (host: string) => !host || OWN_HOSTS.has(host) || host === (ownHost ?? "").replace(/^www\./, "").replace(/:\d+$/, "");

  const [bounds, totals, before, byDay, pages, pageCount, everSeen, single, countries, devices] = await Promise.all([
    q("The range", `SELECT to_char(${since}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS since, to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS until,
                       to_char(now() AT TIME ZONE 'Europe/London', 'YYYY-MM-DD') AS today`),
    q("Visitors and page views", `SELECT COUNT(*)::int AS views, COUNT(DISTINCT "sessionId")::int AS visitors FROM "PageView" WHERE "createdAt" >= ${since}`),
    q("The period before", `SELECT COUNT(*)::int AS views, COUNT(DISTINCT "sessionId")::int AS visitors FROM "PageView" WHERE "createdAt" >= ${prev} AND "createdAt" < ${since}`),
    q("By day", `SELECT ${LONDON_DAY} AS day, COUNT(*)::int AS views, COUNT(DISTINCT "sessionId")::int AS visitors FROM "PageView" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 1`),
    q("Pages", `SELECT "path", COUNT(*)::int AS views, COUNT(DISTINCT "sessionId")::int AS visitors FROM "PageView" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 50`),
    q("Pages", `SELECT COUNT(DISTINCT "path")::int AS c FROM "PageView" WHERE "createdAt" >= ${since}`),
    q("New and returning", `SELECT COUNT(*) FILTER (WHERE first_seen >= ${since})::int AS fresh, COUNT(*)::int AS everyone
                             FROM (SELECT "sessionId", MIN("createdAt") AS first_seen FROM "PageView" GROUP BY 1 HAVING MAX("createdAt") >= ${since}) t`),
    q("One-page visitors", `SELECT COUNT(*)::int AS c FROM (SELECT "sessionId" FROM "PageView" WHERE "createdAt" >= ${since} GROUP BY 1 HAVING COUNT(*) = 1) t`),
    q("Countries", `SELECT COALESCE("country", '') AS country, COUNT(DISTINCT "sessionId")::int AS visitors FROM "PageView" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 40`),
    q("Devices", `SELECT COALESCE("device", '') AS device, COUNT(DISTINCT "sessionId")::int AS visitors FROM "PageView" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 2 DESC, 1`),
  ]);

  // Where each visitor came from: the page view they arrived on in the range.
  // A mailing's tag wins over the site that sent them; our own pages count as none.
  const HOST = `lower(regexp_replace(substring("referrer" from '^[a-zA-Z]+://([^/:?#]+)'), '^www\\.', ''))`;
  let tagged = true;
  let arrivals: Row[] = [];
  try {
    arrivals = (await prisma.$queryRawUnsafe(
      `SELECT COALESCE(campaign, '') AS campaign, COALESCE(host, '') AS host, COUNT(*)::int AS visitors FROM (
         SELECT DISTINCT ON ("sessionId") "sessionId", "campaign", ${HOST} AS host FROM "PageView" WHERE "createdAt" >= ${since} ORDER BY "sessionId", "createdAt"
       ) t GROUP BY 1, 2`,
    )) as Row[];
  } catch {
    tagged = false;
    notes.push("Mailing tags: not recorded yet. Run db/analytics-2.sql against the database.");
    arrivals = await q("Where visitors came from", `SELECT '' AS campaign, COALESCE(host, '') AS host, COUNT(*)::int AS visitors FROM (
         SELECT DISTINCT ON ("sessionId") "sessionId", ${HOST} AS host FROM "PageView" WHERE "createdAt" >= ${since} ORDER BY "sessionId", "createdAt"
       ) t GROUP BY 1, 2`);
  }
  const campaignViews = tagged
    ? await q("Mailing tags", `SELECT "campaign", COUNT(*)::int AS views FROM "PageView" WHERE "createdAt" >= ${since} AND "campaign" IS NOT NULL GROUP BY 1`)
    : [];
  const byHost = new Map<string, number>();
  const byTag = new Map<string, number>();
  for (const r of arrivals) {
    const tag = s(r.campaign);
    if (tag) { byTag.set(tag, (byTag.get(tag) ?? 0) + n(r.visitors)); continue; }
    const host = own(s(r.host)) ? "" : s(r.host);
    byHost.set(host, (byHost.get(host) ?? 0) + n(r.visitors));
  }

  // Buttons and contact links pressed.
  let clicked = true;
  let events: Row[] = [];
  try {
    events = (await prisma.$queryRawUnsafe(
      `SELECT "name", COALESCE("target", '') AS target, COUNT(*)::int AS count, COUNT(DISTINCT "sessionId")::int AS visitors
       FROM "SiteEvent" WHERE "createdAt" >= ${since} GROUP BY 1, 2 ORDER BY 3 DESC, 1 LIMIT 40`,
    )) as Row[];
  } catch {
    clicked = false;
    notes.push("Button clicks: not recorded yet. Run db/analytics-2.sql against the database.");
  }

  // Demos: a visit is one visitor on one day; the time is what the timer sent.
  const [demoRows, catalogue, demoPage] = await Promise.all([
    q("Demos", `SELECT "slug", "sessionId", ${LONDON_DAY} AS day, COALESCE(SUM("durationMs"), 0)::bigint AS ms FROM "DemoSession" WHERE "createdAt" >= ${since} GROUP BY 1, 2, 3`),
    q("The demo catalogue", `SELECT "slug", "name", "launchUrl" FROM "Demo"`),
    q("The demo page", `SELECT COUNT(DISTINCT "sessionId")::int AS c FROM "PageView" WHERE "createdAt" >= ${since} AND "path" = '/demo'`),
  ]);
  // A timed visit is filed under the last part of its address (/demos/tenure -> tenure);
  // a launch is filed under the catalogue's own slug. Where the two differ, the catalogue's
  // is used, and the two are put together before anything is counted.
  const bySlug = new Map(catalogue.map((d) => [s(d.slug), s(d.name)]));
  const byPath = new Map<string, string>();
  for (const d of catalogue) {
    const last = s(d.launchUrl).split(/[?#]/)[0].split("/").filter(Boolean).pop();
    if (last && !byPath.has(last)) byPath.set(last, s(d.slug));
  }
  const tally = new Map<string, { visits: Set<string>; people: Set<string>; ms: number }>();
  const demoPeople = new Set<string>();
  for (const r of demoRows) {
    const raw = s(r.slug);
    const slug = bySlug.has(raw) ? raw : byPath.get(raw) ?? raw;
    const cur = tally.get(slug) ?? { visits: new Set<string>(), people: new Set<string>(), ms: 0 };
    cur.visits.add(s(r.sessionId) + " " + s(r.day)); cur.people.add(s(r.sessionId)); cur.ms += n(r.ms);
    tally.set(slug, cur);
    demoPeople.add(s(r.sessionId));
  }
  const demos = [...tally].map(([slug, v]) => ({ slug, name: bySlug.get(slug) ?? slug, visits: v.visits.size, people: v.people.size, ms: v.ms }));

  // Demo requests: counts, and the latest as they were sent.
  const [reqRange, reqAll, reqSector, reqLatest] = await Promise.all([
    q("Demo requests", `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE "status" = 'APPROVED')::int AS approved,
                               COUNT(*) FILTER (WHERE "status" = 'PENDING')::int AS pending FROM "DemoRequest" WHERE "createdAt" >= ${since}`),
    q("Demo requests", `SELECT "status"::text AS status, COUNT(*)::int AS c FROM "DemoRequest" GROUP BY 1`),
    q("Demo requests", `SELECT COALESCE(NULLIF(trim("sector"), ''), '') AS sector, COUNT(*)::int AS c FROM "DemoRequest" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 2 DESC, 1`),
    q("Demo requests", `SELECT "id", to_char("createdAt", 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS at, "name", "email", "organisation", COALESCE("role", '') AS role,
                               COALESCE("sector", '') AS sector, "requestType"::text AS kind, "status"::text AS status, COALESCE("message", '') AS message
                        FROM "DemoRequest" ORDER BY "createdAt" DESC LIMIT 100`),
  ]);
  const statusCount = (name: string) => n(reqAll.find((r) => s(r.status) === name)?.c);

  // Every day of the range, the empty ones included, so a chart has no gaps.
  const today = s(bounds[0]?.today) || new Date().toISOString().slice(0, 10);
  const seen = new Map(byDay.map((r) => [s(r.day), r]));
  const series: { day: string; visitors: number; views: number }[] = [];
  const t0 = Date.parse(today + "T00:00:00Z");
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(t0 - i * 86_400_000).toISOString().slice(0, 10);
    series.push({ day, visitors: n(seen.get(day)?.visitors), views: n(seen.get(day)?.views) });
  }

  const visitors = n(totals[0]?.visitors);
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    range: { days, since: s(bounds[0]?.since), until: s(bounds[0]?.until), today },
    recording: { mailingTags: tagged, buttonClicks: clicked },
    totals: {
      visitors, views: n(totals[0]?.views),
      visitorsBefore: n(before[0]?.visitors), viewsBefore: n(before[0]?.views),
      newVisitors: n(everSeen[0]?.fresh), returningVisitors: Math.max(0, n(everSeen[0]?.everyone) - n(everSeen[0]?.fresh)),
      onePageVisitors: n(single[0]?.c),
    },
    byDay: series,
    pages: pages.map((r) => ({ path: s(r.path), views: n(r.views), visitors: n(r.visitors) })),
    pageCount: n(pageCount[0]?.c),
    sources: [...byHost].map(([host, v]) => ({ host, visitors: v })).sort((a, b) => b.visitors - a.visitors || a.host.localeCompare(b.host)),
    mailings: [...byTag].map(([tag, v]) => ({ tag, visitors: v, views: n(campaignViews.find((r) => s(r.campaign) === tag)?.views) }))
      .sort((a, b) => b.visitors - a.visitors || a.tag.localeCompare(b.tag)),
    countries: countries.map((r) => ({ country: s(r.country), visitors: n(r.visitors) })),
    devices: devices.map((r) => ({ device: s(r.device), visitors: n(r.visitors) })),
    clicks: events.map((r) => ({ name: s(r.name), target: s(r.target), count: n(r.count), visitors: n(r.visitors) })),
    demos: demos.sort((a, b) => b.ms - a.ms || b.visits - a.visits || a.name.localeCompare(b.name)),
    funnel: {
      visitors, demoPage: n(demoPage[0]?.c), requests: n(reqRange[0]?.total), approved: n(reqRange[0]?.approved), openedDemo: demoPeople.size,
    },
    requests: {
      inRange: n(reqRange[0]?.total), pendingInRange: n(reqRange[0]?.pending),
      total: reqAll.reduce((a, r) => a + n(r.c), 0), pending: statusCount("PENDING"), approved: statusCount("APPROVED"), rejected: statusCount("REJECTED"),
      bySector: reqSector.map((r) => ({ sector: s(r.sector), count: n(r.c) })),
      latest: reqLatest.map((r) => ({
        id: s(r.id), at: s(r.at), name: s(r.name), email: s(r.email), organisation: s(r.organisation), role: s(r.role),
        sector: s(r.sector), kind: s(r.kind), status: s(r.status), message: s(r.message).slice(0, 2000),
      })),
    },
    notes,
  };
}
