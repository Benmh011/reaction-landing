import { revalidatePath } from "next/cache";
import { AT, Refusal, sql, text } from "@/lib/manage";

// The demo catalogue as the managing door reads and checks it (app/api/manage/demos).
//
// The same rules as /admin/demos: where a demo opens is a full address or a
// path on this site. A demo's slug is made from its name when it is added and
// never changes after, because an account is tied to a demo by its slug and
// the time spent in a demo is counted against it.

export type DemoRow = { id: string; slug: string; name: string; description: string; launchUrl: string; accessNote: string; active: boolean; sortOrder: number; updatedAt: string };

export const DEMO_COLUMNS = `"id", "slug", "name", "description", "launchUrl", COALESCE("accessNote", '') AS "accessNote", "active", "sortOrder", ${AT(`"updatedAt"`)} AS "updatedAt"`;

export const listDemos = () => sql<DemoRow>(`SELECT ${DEMO_COLUMNS} FROM "Demo" ORDER BY "sortOrder", "createdAt", "id"`);

/** What may be written on a demo, checked. With all, every field must be there; without, only those in the body are returned. */
export function demoFields(b: Record<string, unknown>, all: boolean) {
  const out: { name?: string; description?: string; launchUrl?: string; accessNote?: string | null } = {};
  if (all || "name" in b) {
    out.name = text(b.name, 120);
    if (out.name.length < 2) throw new Refusal("A demo needs a name.");
  }
  if (all || "description" in b) {
    out.description = text(b.description, 600);
    if (!out.description) throw new Refusal("A demo needs a line saying what it is.");
  }
  if (all || "launchUrl" in b) {
    out.launchUrl = text(b.launchUrl, 500);
    if (!/^(https?:\/\/[^\s]+|\/[^\s]*)$/.test(out.launchUrl)) {
      throw new Refusal("Where it opens must be a full address, like https://example.com/app, or a path on this site starting with /.");
    }
  }
  if (all || "accessNote" in b) out.accessNote = text(b.accessNote, 500) || null;
  return out;
}

/** A slug from a name: lower case, digits and dashes. */
export const slugOf = (name: string) =>
  name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 56).replace(/-+$/g, "") || "demo";

/** /demo and the site's own admin page read the catalogue: have them read it again. */
export const refreshDemoPages = () => {
  revalidatePath("/demo");
  revalidatePath("/admin/demos");
};
