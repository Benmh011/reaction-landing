import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Analytics · Reaction" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ── Access: signed-in AND email === ANALYTICS_EMAIL (the single login you set) ──
// A real DB-backed session (Auth.js) is required; the env var restricts it to one
// account. Set ANALYTICS_EMAIL in Vercel, then sign in at /auth/signin with it.

type Row = Record<string, unknown>;
const n = (v: unknown) => Number(v ?? 0);

function fmtDuration(ms: number): string {
  if (!ms || ms < 1000) return "0s";
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}

// Build a continuous 30-day series (fills gaps with 0) from {day,value} rows.
function daySeries(rows: { day: string; value: number }[], days = 30): number[] {
  const map = new Map(rows.map((r) => [r.day, r.value]));
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    out.push(map.get(d.toISOString().slice(0, 10)) ?? 0);
  }
  return out;
}

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?callbackUrl=/analytics");

  const allowed = (process.env.ANALYTICS_EMAIL ?? "").toLowerCase().trim();
  const email = (session.user.email ?? "").toLowerCase().trim();
  const authorised = allowed.length > 0 && email === allowed;

  if (!authorised) {
    return (
      <>
        <SiteNav signOutHref="/auth/signout" />
        <section style={{ padding: "80px 0", minHeight: "50vh" }}>
          <div className="container" style={{ maxWidth: 560 }}>
            <div className="page-eyebrow">Analytics</div>
            <h1 className="page-title">Not <em>authorised</em>.</h1>
            <p style={{ color: "var(--text-soft)", marginTop: 16 }}>
              This dashboard is restricted to a single account. You&rsquo;re signed in as{" "}
              <strong>{session.user.email}</strong>, which isn&rsquo;t the analytics login.
            </p>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/auth/signin?callbackUrl=/analytics" });
              }}
            >
              <button type="submit" className="btn btn-outlined" style={{ marginTop: 24 }}>
                Sign in with a different account
              </button>
            </form>
          </div>
        </section>
        <SiteFooter />
      </>
    );
  }

  // ─────────────── QUERIES ───────────────
  const [
    pvTotals,
    pvDaily,
    topPages,
    devices,
    demoTotals,
    demoBySlug,
    reqDaily,
    demoReqTotal,
    demoReqPending,
    demoReqApproved,
    recentReqs,
    agentMetrics,
  ] = await Promise.all([
    prisma.$queryRaw<Row[]>`
      SELECT COUNT(*)::int AS views, COUNT(DISTINCT "sessionId")::int AS visitors
      FROM "PageView" WHERE "createdAt" > now() - interval '30 days'`,
    prisma.$queryRaw<Row[]>`
      SELECT to_char(date_trunc('day',"createdAt"),'YYYY-MM-DD') AS day,
             COUNT(*)::int AS views, COUNT(DISTINCT "sessionId")::int AS visitors
      FROM "PageView" WHERE "createdAt" > now() - interval '30 days'
      GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<Row[]>`
      SELECT "path", COUNT(*)::int AS views
      FROM "PageView" WHERE "createdAt" > now() - interval '30 days'
      GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
    prisma.$queryRaw<Row[]>`
      SELECT COALESCE("device",'unknown') AS device, COUNT(*)::int AS c
      FROM "PageView" WHERE "createdAt" > now() - interval '30 days'
      GROUP BY 1 ORDER BY 2 DESC`,
    prisma.$queryRaw<Row[]>`
      SELECT COUNT(*)::int AS sessions,
             COALESCE(SUM("durationMs"),0)::bigint AS total_ms,
             COALESCE(AVG("durationMs"),0)::int AS avg_ms
      FROM "DemoSession" WHERE "createdAt" > now() - interval '30 days'`,
    prisma.$queryRaw<Row[]>`
      SELECT "slug", COUNT(*)::int AS sessions,
             COALESCE(SUM("durationMs"),0)::bigint AS total_ms,
             COALESCE(AVG("durationMs"),0)::int AS avg_ms
      FROM "DemoSession" WHERE "createdAt" > now() - interval '30 days'
      GROUP BY 1 ORDER BY total_ms DESC LIMIT 10`,
    prisma.$queryRaw<Row[]>`
      SELECT to_char(date_trunc('day',"createdAt"),'YYYY-MM-DD') AS day, COUNT(*)::int AS c
      FROM "DemoRequest" WHERE "createdAt" > now() - interval '30 days'
      GROUP BY 1 ORDER BY 1`,
    prisma.demoRequest.count(),
    prisma.demoRequest.count({ where: { status: "PENDING" } }),
    prisma.demoRequest.count({ where: { status: "APPROVED" } }),
    prisma.demoRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, organisation: true, status: true, createdAt: true },
    }),
    prisma.$queryRaw<Row[]>`
      SELECT DISTINCT ON ("client","metric")
             "client","metric","value","unit","capturedAt"
      FROM "AgentMetric" ORDER BY "client","metric","capturedAt" DESC`,
  ]);

  const views30 = n(pvTotals[0]?.views);
  const visitors30 = n(pvTotals[0]?.visitors);
  const viewsSeries = daySeries(pvDaily.map((r) => ({ day: String(r.day), value: n(r.views) })));
  const visitorSeries = daySeries(pvDaily.map((r) => ({ day: String(r.day), value: n(r.visitors) })));
  const reqSeries = daySeries(reqDaily.map((r) => ({ day: String(r.day), value: n(r.c) })));

  const demoSessions = n(demoTotals[0]?.sessions);
  const demoTotalMs = n(demoTotals[0]?.total_ms);
  const demoAvgMs = n(demoTotals[0]?.avg_ms);

  const maxPage = Math.max(1, ...topPages.map((p) => n(p.views)));
  const maxDemo = Math.max(1, ...demoBySlug.map((d) => n(d.total_ms)));
  const deviceTotal = Math.max(1, devices.reduce((s, d) => s + n(d.c), 0));

  // Group agent metrics by client for display
  const byClient = new Map<string, { metric: string; value: number; unit: string | null }[]>();
  for (const m of agentMetrics) {
    const c = String(m.client);
    if (!byClient.has(c)) byClient.set(c, []);
    byClient.get(c)!.push({ metric: String(m.metric), value: n(m.value), unit: (m.unit as string) ?? null });
  }

  return (
    <>
      <SiteNav signOutHref="/auth/signout" />

      <section style={{ padding: "56px 0 24px" }}>
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div className="page-eyebrow">Analytics · last 30 days</div>
              <h1 className="page-title"><em>Reaction</em> dashboard.</h1>
            </div>
            <div className="mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {session.user.email}
            </div>
          </div>
        </div>
      </section>

      {/* KPI ROW */}
      <section style={{ padding: "0 0 24px" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }} className="an-kpis">
            <Stat label="Visitors" value={visitors30.toLocaleString()} sub="unique, 30d" />
            <Stat label="Page views" value={views30.toLocaleString()} sub="30d" />
            <Stat label="Demo requests" value={demoReqTotal.toLocaleString()} sub={`${demoReqPending} pending · ${demoReqApproved} approved`} />
            <Stat label="Demo visits" value={demoSessions.toLocaleString()} sub="30d" accent />
            <Stat label="Avg time on demo" value={fmtDuration(demoAvgMs)} sub="per visit" accent />
            <Stat label="Total demo time" value={fmtDuration(demoTotalMs)} sub="30d" accent />
          </div>
        </div>
      </section>

      {/* VISITORS CHART */}
      <section style={{ padding: "0 0 24px" }}>
        <div className="container">
          <div className="panel">
            <PanelHead title="Traffic" note="Page views (line) and unique visitors (area), daily" />
            <AreaChart area={visitorSeries} line={viewsSeries} />
          </div>
        </div>
      </section>

      {/* TOP PAGES + DEVICES */}
      <section style={{ padding: "0 0 24px" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }} className="an-two">
            <div className="panel">
              <PanelHead title="Top pages" note="30d" />
              {topPages.length === 0 ? <Empty /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                  {topPages.map((p) => (
                    <BarRow key={String(p.path)} label={String(p.path)} value={n(p.views)} max={maxPage} display={n(p.views).toLocaleString()} />
                  ))}
                </div>
              )}
            </div>
            <div className="panel">
              <PanelHead title="Devices" note="30d" />
              {devices.length === 0 ? <Empty /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                  {devices.map((d) => {
                    const pct = Math.round((n(d.c) / deviceTotal) * 100);
                    return <BarRow key={String(d.device)} label={String(d.device)} value={n(d.c)} max={deviceTotal} display={`${pct}%`} />;
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* DEMO ENGAGEMENT */}
      <section style={{ padding: "0 0 24px" }}>
        <div className="container">
          <div className="panel">
            <PanelHead title="Time spent on demos" note="Total time per demo surface, 30d" />
            {demoBySlug.length === 0 ? <Empty hint="No demo visits recorded yet — data appears once visitors open /portal or a /demo-app page." /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                {demoBySlug.map((d) => (
                  <BarRow
                    key={String(d.slug)}
                    label={String(d.slug)}
                    value={n(d.total_ms)}
                    max={maxDemo}
                    display={`${fmtDuration(n(d.total_ms))} · ${n(d.sessions)} visits · avg ${fmtDuration(n(d.avg_ms))}`}
                    accent
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* DEMO REQUESTS */}
      <section style={{ padding: "0 0 24px" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="an-two">
            <div className="panel">
              <PanelHead title="Demo requests" note="Daily, 30d" />
              <AreaChart area={reqSeries} />
            </div>
            <div className="panel">
              <PanelHead title="Recent requests" note="" />
              {recentReqs.length === 0 ? <Empty /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {recentReqs.map((r) => (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--rule)" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "0.92rem", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                        <div className="mono" style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{r.organisation}</div>
                      </div>
                      <StatusPill status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CLIENT / AGENT METRICS */}
      <section style={{ padding: "0 0 90px" }}>
        <div className="container">
          <div className="panel">
            <PanelHead title="Client agent metrics" note="Latest reported value per client" />
            {byClient.size === 0 ? (
              <Empty hint="No client metrics yet. Feed them from your agent pipelines by inserting into the AgentMetric table (client, metric, value, unit)." />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginTop: 12 }}>
                {[...byClient.entries()].map(([client, metrics]) => (
                  <div key={client} style={{ border: "1px solid var(--rule)", borderRadius: 12, padding: 18 }}>
                    <div className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--reaction)", marginBottom: 12 }}>{client}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {metrics.map((m) => (
                        <div key={m.metric} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                          <span style={{ fontSize: "0.82rem", color: "var(--text-soft)" }}>{m.metric.replace(/_/g, " ")}</span>
                          <span style={{ fontFamily: "'Newsreader', Georgia, serif", fontStyle: "italic", fontWeight: 600, fontSize: "1.15rem", color: "var(--text)" }}>
                            {m.value.toLocaleString()}{m.unit ? <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontStyle: "normal" }}> {m.unit}</span> : null}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <SiteFooter />

      <style>{`
        @media (max-width: 860px) {
          .an-kpis { grid-template-columns: 1fr 1fr !important; }
          .an-two { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 520px) {
          .an-kpis { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}

// ─────────────── PRESENTATION COMPONENTS (server) ───────────────

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="panel panel-tight">
      <div className="mono" style={{ fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontStyle: "italic", fontWeight: 600, fontSize: "2rem", lineHeight: 1, color: accent ? "var(--action-deep)" : "var(--text)" }}>{value}</div>
      {sub ? <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 8 }}>{sub}</div> : null}
    </div>
  );
}

function PanelHead({ title, note }: { title: string; note?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
      <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontStyle: "italic", fontWeight: 600, fontSize: "1.35rem", color: "var(--text)", margin: 0 }}>{title}</h2>
      {note ? <span className="mono" style={{ fontSize: "0.66rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>{note}</span> : null}
    </div>
  );
}

function BarRow({ label, value, max, display, accent }: { label: string; value: number; max: number; display: string; accent?: boolean }) {
  const pct = Math.max(2, Math.round((value / max) * 100));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 5 }}>
        <span className="mono" style={{ fontSize: "0.74rem", color: "var(--text-soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
        <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>{display}</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: "var(--bg-surface)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: accent ? "var(--action)" : "var(--reaction)" }} />
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = { PENDING: "var(--warning)", APPROVED: "var(--success)", REJECTED: "var(--danger)" };
  const c = map[status] ?? "var(--text-muted)";
  return (
    <span className="mono" style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: c, border: `1px solid ${c}`, borderRadius: 999, padding: "3px 10px", height: "fit-content", whiteSpace: "nowrap" }}>
      {status}
    </span>
  );
}

function Empty({ hint }: { hint?: string }) {
  return (
    <div style={{ padding: "28px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
      {hint ?? "No data yet."}
    </div>
  );
}

// Server-rendered area/line chart. `area` is filled; optional `line` overlaid.
function AreaChart({ area, line }: { area: number[]; line?: number[] }) {
  const W = 720, H = 180, P = 6;
  const all = [...area, ...(line ?? [])];
  const max = Math.max(1, ...all);
  const step = area.length > 1 ? (W - P * 2) / (area.length - 1) : 0;
  const x = (i: number) => P + i * step;
  const y = (v: number) => H - P - (v / max) * (H - P * 2);

  const areaLine = area.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const areaFill = `${areaLine} L ${x(area.length - 1).toFixed(1)} ${H - P} L ${x(0).toFixed(1)} ${H - P} Z`;
  const linePath = line ? line.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ") : "";
  const empty = all.every((v) => v === 0);

  return (
    <div style={{ marginTop: 10 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="180" preserveAspectRatio="none" role="img" aria-label="chart">
        <defs>
          <linearGradient id="rxArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--reaction)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--reaction)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaFill} fill="url(#rxArea)" />
        <path d={areaLine} fill="none" stroke="var(--reaction)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {line ? <path d={linePath} fill="none" stroke="var(--action)" strokeWidth="1.5" strokeDasharray="4 3" strokeLinejoin="round" /> : null}
      </svg>
      {empty ? <div style={{ marginTop: -110, textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", position: "relative" }}>No activity in this window yet.</div> : null}
      <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6rem", color: "var(--text-muted)", marginTop: 6 }}>
        <span>30 days ago</span><span>today</span>
      </div>
    </div>
  );
}
