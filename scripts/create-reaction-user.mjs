// Mirror a demo login into reaction's OWN database, so the same email +
// password works at reaction.org.uk/auth/signin as well as the vet demo login.
//
// This does NOT touch the vet database — run the vet's own create-user for
// that side. Run BOTH (or use create-demo-login.bat, which chains them) so a
// client's single credential works on both login pages.
//
//   node scripts/create-reaction-user.mjs <email> <password> ["Full Name"]
//
// Reads DATABASE_URL from the environment or a local .env in the repo root.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";

// Minimal .env loader (no dotenv dependency needed).
try {
  const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  // no .env file — rely on already-set environment variables
}

const [email, password, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(" ") || null;

if (!email || !password) {
  console.log('Usage: node scripts/create-reaction-user.mjs <email> <password> ["Full Name"]');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("  ✗ DATABASE_URL not set (add it to .env or the environment).");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const passwordHash = await bcrypt.hash(password, 10);
  const lower = email.toLowerCase().trim();
  const user = await prisma.user.upsert({
    where: { email: lower },
    create: {
      email: lower,
      name,
      passwordHash,
      role: "CLIENT",
      requestType: "BUSINESS",
      emailVerified: new Date(), // admin-provisioned; skip verification round-trip
    },
    update: { passwordHash, ...(name ? { name } : {}) },
  });
  console.log(`\n  ✓ Reaction account ready: ${user.email}`);
  console.log(`  This login now works at reaction.org.uk/auth/signin (Password tab).`);
  console.log(`  Remember to create the SAME email + password on the vet side too.\n`);
} catch (e) {
  console.error("  ✗ Failed:", e.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
