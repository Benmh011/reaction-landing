import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import SiteNav from "@/components/SiteNav";
import AdminNav from "@/components/AdminNav";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Demos · Admin · Reaction" };
export const dynamic = "force-dynamic";

/**
 * Demo catalogue manager — personal to the owner account.
 *
 * Access: signed in AND email === OWNER_EMAIL (default info@reaction.org.uk).
 * This is stricter than the ADMIN role on purpose: only our account manages
 * which demos exist and where they launch to. accessNote is private and only
 * ever rendered here.
 */

const OWNER = (process.env.OWNER_EMAIL ?? "info@reaction.org.uk").toLowerCase();

async function requireOwner() {
  const session = await auth();
  const email = (session?.user?.email ?? "").toLowerCase();
  if (!session?.user || email !== OWNER) return null;
  return session;
}

// ── Server actions (each independently owner-gated) ──

async function createDemo(formData: FormData) {
  "use server";
  if (!(await requireOwner())) return;
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const description = String(formData.get("description") ?? "").trim();
  const launchUrl = String(formData.get("launchUrl") ?? "").trim();
  const accessNote = String(formData.get("accessNote") ?? "").trim() || null;
  if (!name || !slug || !description || !launchUrl) return;
  if (!/^(https?:\/\/|\/)/.test(launchUrl)) return; // external URL or internal path
  await prisma.demo.create({
    data: { name, slug, description, launchUrl, accessNote, active: true, sortOrder: 99 },
  }).catch(() => undefined); // duplicate slug etc. — fail quiet, page re-renders
  revalidatePath("/admin/demos");
  revalidatePath("/demo");
}

async function updateDemo(formData: FormData) {
  "use server";
  if (!(await requireOwner())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const launchUrl = String(formData.get("launchUrl") ?? "").trim();
  if (!/^(https?:\/\/|\/)/.test(launchUrl)) return; // external URL or internal path
  await prisma.demo.update({
    where: { id },
    data: {
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      launchUrl,
      accessNote: String(formData.get("accessNote") ?? "").trim() || null,
      sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
    },
  }).catch(() => undefined);
  revalidatePath("/admin/demos");
  revalidatePath("/demo");
}

async function toggleDemo(formData: FormData) {
  "use server";
  if (!(await requireOwner())) return;
  const id = String(formData.get("id") ?? "");
  const demo = await prisma.demo.findUnique({ where: { id } });
  if (!demo) return;
  await prisma.demo.update({ where: { id }, data: { active: !demo.active } });
  revalidatePath("/admin/demos");
  revalidatePath("/demo");
}

async function deleteDemo(formData: FormData) {
  "use server";
  if (!(await requireOwner())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.demo.delete({ where: { id } }).catch(() => undefined);
  revalidatePath("/admin/demos");
  revalidatePath("/demo");
}

// ── Page ──

const label = { display: "block", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--text-muted)", margin: "12px 0 6px", fontFamily: "'JetBrains Mono', monospace" };
const input = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--rule)", background: "var(--input-bg)", fontSize: "0.92rem", color: "var(--text)" };

export default async function AdminDemosPage() {
  const session = await requireOwner();
  if (!session) {
    const s = await auth();
    if (!s?.user) redirect("/auth/signin?callbackUrl=/admin/demos");
    // Signed in but not the owner — this surface is personal.
    return (
      <>
        <SiteNav signOutHref="/auth/signout" />
        <section style={{ padding: "80px 0", minHeight: "50vh" }}>
          <div className="container" style={{ maxWidth: 560 }}>
            <div className="page-eyebrow">Admin · Demos</div>
            <h1 className="page-title">Not <em>authorised</em>.</h1>
            <p style={{ color: "var(--text-soft)", marginTop: 16 }}>
              Demo management is restricted to the owner account.
            </p>
          </div>
        </section>
        <SiteFooter />
      </>
    );
  }

  const demos = await prisma.demo.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });

  return (
    <>
      <SiteNav signOutHref="/auth/signout" />
      <AdminNav active="demos" />

      <section style={{ padding: "10px 0 90px" }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <div className="page-eyebrow">Admin · Demos</div>
          <h1 className="page-title">The demo <em>catalogue</em>.</h1>
          <p style={{ color: "var(--text-soft)", margin: "14px 0 36px", maxWidth: "62ch", lineHeight: 1.6 }}>
            Everything listed here (and marked active) appears on the public <a href="/demo" style={{ color: "var(--reaction)" }}>/demo</a> page
            as a launchable demo. Launch URLs point at the hosted software itself — its own sign-in is the gate.
            Access notes are private to this page.
          </p>

          {/* Existing demos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 44 }}>
            {demos.length === 0 && (
              <div className="panel" style={{ color: "var(--text-muted)" }}>
                No demos yet — add the first one below. (If you expected the Southmoor Vets entry,
                run <code>db/business-demos.sql</code> on Neon.)
              </div>
            )}
            {demos.map((d) => (
              <div key={d.id} className="panel" style={{ borderLeft: `3px solid ${d.active ? "var(--reaction)" : "var(--rule-strong)"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <div className="mono" style={{ fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", color: d.active ? "var(--reaction)" : "var(--text-muted)" }}>
                    {d.active ? "Active — live on /demo" : "Inactive — hidden"} · {d.slug}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <form action={toggleDemo}>
                      <input type="hidden" name="id" value={d.id} />
                      <button type="submit" className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
                        {d.active ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                    <form action={deleteDemo}>
                      <input type="hidden" name="id" value={d.id} />
                      <button type="submit" className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: "0.8rem", color: "var(--danger)", borderColor: "var(--danger)" }}>
                        Delete
                      </button>
                    </form>
                  </div>
                </div>

                <form action={updateDemo} style={{ marginTop: 8 }}>
                  <input type="hidden" name="id" value={d.id} />
                  <label style={label} htmlFor={`name-${d.id}`}>Name</label>
                  <input style={input} id={`name-${d.id}`} name="name" defaultValue={d.name} required />
                  <label style={label} htmlFor={`desc-${d.id}`}>Description (shown publicly)</label>
                  <textarea style={{ ...input, minHeight: 74 }} id={`desc-${d.id}`} name="description" defaultValue={d.description} required />
                  <label style={label} htmlFor={`url-${d.id}`}>Launch URL</label>
                  <input style={input} id={`url-${d.id}`} name="launchUrl" defaultValue={d.launchUrl} required />
                  <label style={label} htmlFor={`note-${d.id}`}>Access note (private — only visible here)</label>
                  <input style={input} id={`note-${d.id}`} name="accessNote" defaultValue={d.accessNote ?? ""} />
                  <label style={label} htmlFor={`sort-${d.id}`}>Sort order (lower = first)</label>
                  <input style={{ ...input, maxWidth: 120 }} id={`sort-${d.id}`} name="sortOrder" type="number" defaultValue={d.sortOrder} />
                  <div style={{ marginTop: 14 }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: "8px 20px", fontSize: "0.85rem" }}>
                      Save changes
                    </button>
                  </div>
                </form>
              </div>
            ))}
          </div>

          {/* Add new */}
          <div className="panel">
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontStyle: "italic", fontWeight: 600, fontSize: "1.3rem", margin: "0 0 14px" }}>
              Add a demo
            </h2>
            <form action={createDemo}>
              <label style={label} htmlFor="new-name">Name</label>
              <input style={input} id="new-name" name="name" required placeholder="Bibby's Plumbing — Compliance Assistant" />
              <label style={label} htmlFor="new-slug">Slug (unique, lowercase)</label>
              <input style={input} id="new-slug" name="slug" required placeholder="bibbys-plumbing" pattern="[a-z0-9-]+" />
              <label style={label} htmlFor="new-desc">Description (shown publicly)</label>
              <textarea style={{ ...input, minHeight: 74 }} id="new-desc" name="description" required />
              <label style={label} htmlFor="new-url">Launch URL (https://…)</label>
              <input style={input} id="new-url" name="launchUrl" type="text" required placeholder="https://… or /demos/…" />
              <label style={label} htmlFor="new-note">Access note (private)</label>
              <input style={input} id="new-note" name="accessNote" placeholder="Where the credentials live — never the credentials themselves" />
              <div style={{ marginTop: 16 }}>
                <button type="submit" className="btn btn-primary">
                  Add demo
                  <span className="arrow" aria-hidden="true">→</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
