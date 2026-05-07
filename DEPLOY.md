# Reaction — Deploy Guide

This is a Next.js app with Auth.js (magic link + password), Prisma, Vercel Postgres, and Resend for transactional email. It replaces the static landing page.

## What you're deploying

```
/                  Public landing page (the same content as before, ported to React)
/demo              Public demo-request form
/auth/signin       Sign-in page (magic link + password fallback)
/auth/verify-request   "Check your inbox" page after magic link sent
/portal            Logged-in client portal (placeholder for the React app build)
/admin             Admin dashboard (only visible to ADMIN users)
/admin/requests    Review & approve demo requests
/admin/users       Manage existing users (set demo build, set passwords)
/admin/setup       One-time bootstrap to create the first admin (auto-disables after)
```

---

## STEP-BY-STEP DEPLOY

### 1 · Push to GitHub

In a new local folder:

```
git init
git add .
git commit -m "Initial Reaction app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/reaction.git
git push -u origin main
```

### 2 · Create the Vercel project

- Go to vercel.com → **Add New → Project** → import the repo
- Framework: **Next.js** (auto-detected)
- Don't deploy yet — go to Settings first to add the database

### 3 · Add Vercel Postgres

- In your Vercel project, **Storage** tab → **Create database** → Postgres → Hobby tier
- Connect it to the project — Vercel auto-injects `DATABASE_URL` and `DIRECT_URL`

### 4 · Set up Resend

- Sign up at resend.com (free tier — 100 emails/day, 3,000/month)
- **Domains** → Add Domain → enter `reaction.org.uk`
- Resend will give you DNS records (SPF, DKIM, optionally DMARC) — add them at your domain registrar alongside the existing Vercel A/CNAME records. **Do not remove your existing Vercel records.**
- Wait for verification (usually < 30 min)
- **API Keys** → Create API Key → copy the value (starts with `re_`)

### 5 · Set environment variables in Vercel

In your Vercel project → **Settings → Environment Variables**, add:

| Key | Value |
|---|---|
| `AUTH_SECRET` | Run `openssl rand -base64 32` locally and paste the output |
| `AUTH_URL` | `https://reaction.org.uk` |
| `RESEND_API_KEY` | The `re_...` key you just made |
| `EMAIL_FROM` | `Reaction <hello@reaction.org.uk>` (or any verified address) |
| `ADMIN_EMAIL` | `info@reaction.org.uk` |
| `ADMIN_EMAIL_INITIAL` | `info@reaction.org.uk` (your first admin login) |
| `ADMIN_PASSWORD_INITIAL` | A strong password — min 10 chars. **You'll delete this after first login.** |

`DATABASE_URL` and `DIRECT_URL` are already set automatically by the Vercel Postgres integration.

### 6 · Deploy

- Click **Deploy**. The build will run `prisma generate && next build` — this takes about 90 seconds the first time.

### 7 · Push the database schema

After the first deploy, you need to create the tables in Postgres. From your local machine, in the project folder:

```
npm install
# Pull the env vars Vercel set up
npx vercel link            # connect this folder to the Vercel project
npx vercel env pull .env   # pulls DATABASE_URL etc into a local .env
npx prisma db push         # creates all tables
```

That's a one-time step. Subsequent schema changes follow the same pattern: edit `prisma/schema.prisma`, run `prisma db push`.

### 8 · Create your admin account

- Visit `https://reaction.org.uk/admin/setup` once
- The page reads `ADMIN_EMAIL_INITIAL` + `ADMIN_PASSWORD_INITIAL` and creates the admin user
- After it shows "Admin created", **delete `ADMIN_PASSWORD_INITIAL` from Vercel env vars** and redeploy
- The setup page is now permanently disabled (it self-locks once an admin exists)

### 9 · Connect your custom domain

- Vercel project → **Settings → Domains** → add `reaction.org.uk` and `www.reaction.org.uk`
- DNS should already be pointing here from before — should "just work" with green checkmarks
- Otherwise, follow the same A record / CNAME steps as before

---

## DAILY WORKFLOW

**Someone fills the demo form:**
- Their request lands in the database
- You get an email at `info@reaction.org.uk` with the details
- Sign in to `/admin` → **Pending requests** → review the message → **Approve & send magic link**
- They get a welcome email with a sign-in button

**You want to set their bespoke build:**
- After approving, set the **Demo version** field to a folder name (e.g. `exeter-su` or `kings-students-union`)
- That folder must exist under `/public/demos/` in your repo for them to launch the demo
- For now, leaving it as `default` shows the placeholder portal (which is fine — your account-manager note kicks in)

**Adding a bespoke React build (later):**
- Put a built static version of the React app under `public/demos/<their-slug>/index.html`
- Set their user's `demoVersion` to `<their-slug>`
- They'll see "Launch demo" → opens that folder

---

## LOCAL DEV

```
npm install
npx vercel env pull .env       # or copy .env.example to .env.local and fill in values
npx prisma db push
npm run dev
```

Then visit `http://localhost:3000`. To test the admin bootstrap locally, set the two `ADMIN_*` env vars and visit `/admin/setup`.

---

## SECURITY NOTES

- Passwords are bcrypt-hashed at cost 12 — never stored in plaintext
- Sessions use JWT (signed with `AUTH_SECRET`) — rotate the secret if you ever suspect compromise
- Magic links are single-use, expire after 24 hours, and are sent only via verified domain email
- Middleware enforces `/portal/*` and `/admin/*` access control at the edge before any page renders
- The setup route auto-disables once an admin exists — you can also delete `app/admin/setup/page.tsx` after first run if you want belt-and-braces
- All admin API endpoints check `session.user.role === "ADMIN"` server-side — middleware alone is not enough
- Rate-limit the demo-request endpoint and sign-in endpoints when traffic justifies it (Vercel KV + Upstash makes this a 5-min job)

---

## WHAT'S NEXT (next session)

- Bundle the existing JSX React app as a static build into `/public/demos/default/` so logged-in users see something interactive
- Add per-client variants under `/public/demos/<slug>/`
- Optional: an admin "Send magic link to existing user" button on the users page
- Optional: rate limiting on the demo-request and signin endpoints
- Optional: an `onFormSubmit` Slack/Discord webhook in addition to email
