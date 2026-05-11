# Email rebrand + unsubscribe system

Rebrands all outbound emails to the new blue/grey palette + adds a real
unsubscribe flow with List-Unsubscribe headers for spam-filter reputation.

## What's in this bundle

```
lib/email-templates.ts             ← NEW (shared template helper + HMAC token logic)
auth.ts                            ← UPDATED (uses shared template)
app/api/demo-request/route.ts      ← UPDATED (rebrand + new prospect ack email)
app/api/unsubscribe/route.ts       ← NEW (handles GET + POST one-click)
app/unsubscribe/page.tsx           ← NEW (confirmation page)
prisma/SCHEMA-PATCH.md             ← Schema changes to apply manually
```

## What changes for users

**Magic-link sign-in email** — same flow, new look:
- Pearl grey background, white card, slate blue Reaction wordmark
- Deep navy CTA button
- Footer with reaction.org.uk + Contact us
- NO unsubscribe link (it's transactional — users would lock themselves out)
- BUT List-Unsubscribe headers ARE added for spam-filter reputation

**Demo-request admin notification** — same content, new look. Internal-only, no unsubscribe.

**Prospect acknowledgment** — NEW. When someone submits the demo form, they
now receive a "Thanks for getting in touch" email within seconds. Includes:
- Personalised greeting using their first name
- Confirmation we'll respond within one business day
- Working Unsubscribe link in the footer

## ⚠️ Deploy order matters

This bundle changes the Prisma schema. Two days ago we had a production outage
because the schema was pushed before the code. This time do it in the safe order:

### Step 1 — Apply the schema patch manually

Open `prisma/schema.prisma` on your Mac. Make the two changes described in
`prisma/SCHEMA-PATCH.md` (add `marketingOptOut` to User, add EmailOptOut model).

### Step 2 — Copy the new code into place

```
cp -R ~/Downloads/email-rebrand/. ~/Reaction/
```

(Or the Windows xcopy equivalent if deploying from there.)

### Step 3 — Push the schema to production DB

```
cd ~/Reaction
npx prisma db push
npx prisma generate
```

This adds the new column + table BEFORE the code references them.

The code is also defensive — if `marketingOptOut` is missing it treats users
as not-opted-out, so we won't have an outage even if step 3 is briefly delayed.

### Step 4 — Commit + push

```
cd ~/Reaction
git add -A
git commit -m "Rebrand emails + add unsubscribe with List-Unsubscribe headers"
git push
```

Vercel deploys ~90 sec.

### Step 5 — Verify

1. Submit a test demo request from /demo using a real email you can read
2. Check inbox for the new acknowledgment email (pearl grey + slate blue branding)
3. Check the admin email (info@reaction.org.uk) for the admin notification
4. Click the "Unsubscribe" link in the prospect email — should land on /unsubscribe with confirmation
5. Trigger a magic-link signin from /auth/signin — should arrive in new branded style with NO unsubscribe link in footer

## Optional: View source of an inbox email

In Gmail: click ⋮ → "Show original". Look for these headers:
```
List-Unsubscribe: <mailto:info@reaction.org.uk?subject=unsubscribe>, <https://reaction.org.uk/unsubscribe?email=...&token=...>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

If both are present, Gmail will show the prominent "Unsubscribe" button next
to the sender name on receiving devices — major spam-filter goodwill.

## Security note

Unsubscribe links are signed with HMAC-SHA256 of the email + AUTH_SECRET. This
means:
- A token only works for the email it was generated for
- Tokens can't be forged without AUTH_SECRET
- Tokens don't expire (intentional — old emails should still work)
- Verification is timing-safe (no length-leak attacks)

## Known limitations

1. The shared template is **light-mode only** (no dark mode). All email clients
   handle light/dark differently — fighting them is a losing battle. The
   `color-scheme: light only` meta tag tells modern clients not to apply
   automatic dark-mode inversion.

2. The Newsreader font won't load in any email client. Falls back to Georgia
   which is a safe default (installed on Windows, macOS, iOS, Android, ChromeOS).

3. The `EmailOptOut` table is populated but not yet *checked* in `auth.ts`
   (because magic-link is transactional). If you later add marketing emails
   to logged-in users (newsletter, product announcements), import the helper
   and check `EmailOptOut.findUnique({ where: { email } })` before sending.

4. **Existing users who submitted demo requests before this deploy** won't have
   `marketingOptOut` set, but the field defaults to `false`, so they'll receive
   acknowledgments on any future submissions. No backfill needed.

## Roll back

If something breaks badly, the previous deployment in Vercel can be promoted
back. The schema change (added column + table) is backward compatible — the
old code ignored these fields, so rolling back doesn't break anything.
