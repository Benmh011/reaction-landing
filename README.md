# Auth fix — deployment notes

Two changes in this bundle:

## 1. One-click magic link on approval
**File**: `app/api/admin/requests/[id]/approve/route.ts`

Replaces the previous "click here to sign in" email (which dumped users on the
sign-in form) with a real Auth.js magic-link flow. After admin approval, one
email is sent containing a real one-time token that signs the user in directly
when clicked.

Implementation: uses `signIn("resend", { email, redirect: false, redirectTo: "/portal" })`
which delegates email-sending to Auth.js's existing Resend provider config in
`auth.ts`. The email template is whatever your `auth.ts`'s `sendVerificationRequest`
produces.

## 2. Admin → Dashboard navigation
**File**: `components/AdminNav.tsx` (NEW)

Small nav strip you mount at the top of each admin page. Provides:
- Quick links between admin sections (Overview / Requests / Users)
- A "View as user (Dashboard)" button that links to `/portal`

**You need to add this to each admin page yourself.** I don't have visibility
into your existing admin page files, so I can't edit them automatically. Do this:

### app/admin/page.tsx (admin home)
Add at the top of the JSX, just inside `<>`:
```tsx
import AdminNav from "@/components/AdminNav";

// ... in the component
return (
  <>
    <SiteNav signOutHref="/auth/signout" />
    <AdminNav active="home" />
    {/* ... rest of page */}
  </>
);
```

### app/admin/requests/page.tsx
```tsx
import AdminNav from "@/components/AdminNav";

return (
  <>
    <SiteNav signOutHref="/auth/signout" />
    <AdminNav active="requests" />
    {/* ... rest of page */}
  </>
);
```

### app/admin/users/page.tsx
```tsx
import AdminNav from "@/components/AdminNav";

return (
  <>
    <SiteNav signOutHref="/auth/signout" />
    <AdminNav active="users" />
    {/* ... rest of page */}
  </>
);
```

Save each file, push, deploy.

## Deploy steps

```
cd C:\Users\Rhys\Reaction
git add -A
git commit -m "One-click magic link + admin Dashboard nav"
git push
```

Vercel auto-deploys (~90 sec).

## Test the magic link flow

1. In incognito, visit /demo and submit a fake request as Employer
2. Sign in as admin in another tab — see request, approve
3. Check the email inbox of the test address — ONE email should arrive
4. Click the link in the email — should land directly at /portal, signed in
5. No intermediate sign-in form

## Test the Dashboard button

1. As admin, visit /admin/requests
2. Top of page should show: Overview · Requests · Users links plus "View as user" button
3. Click "View as user" — lands at /portal showing the user-facing view

## If something breaks

The approve route is the most architecturally significant change. If the
magic-link send silently fails (Auth.js v5 doesn't always throw), the admin's
"approve" call still succeeds and the user record is created — you just need
to nudge the user to /auth/signin to request a fresh link manually.

Watch Vercel runtime logs after the first real approval to confirm the
email is being sent. If not, the diagnostic info will be in the Auth.js logs.
