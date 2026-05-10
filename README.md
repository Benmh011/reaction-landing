# Pre-provisioned user accounts

Adds a "Create user" button to /admin/users that opens a form for creating
accounts directly — skipping the public demo-form approval flow.

## What's in this bundle

```
app/api/admin/users/new/route.ts        ← NEW (POST endpoint)
app/admin/users/new/page.tsx            ← NEW (form page wrapper)
app/admin/users/new/NewUserForm.tsx     ← NEW (form + success card)
app/admin/users/page.tsx                ← UPDATED (adds "Create user" button)
```

## How it works

1. Admin clicks "Create user" on /admin/users
2. Fills in: Login email, Name, Organisation, Account type, Demo version, Password
3. On submit, account is created and a success card shows the credentials ONCE
4. Admin copies the email + password (there's a "Copy both" button) and sends
   to the user through their own channel (email, LinkedIn, in-person, etc.)
5. User signs in at /auth/signin with that email + password

The password is hashed in the DB (bcrypt) — once the success card is dismissed,
the plain-text password cannot be retrieved. If the user loses it, admin can
reset via the existing edit-user flow on /admin/users.

## Email convention

The login email is admin-controlled and doesn't need to receive mail. The
suggested format is:

  <role>@<institution>.reaction.org.uk

Examples:
  supres@plymouth.reaction.org.uk
  vp-engagement@exeter.reaction.org.uk
  hr-manager@tamar-defence.reaction.org.uk

Free-text — admin can type whatever pattern they like.

## Safety

- Admin-only endpoint (checks session role)
- Validates input (email format, password ≥10 chars)
- Rejects duplicate emails
- Logs every creation to Vercel runtime logs as [AUDIT] user_preprovisioned
- emailVerified set automatically (admin trusted the email)

## Deploy

```
xcopy /E /Y "%USERPROFILE%\Downloads\preprovision\*" "C:\Users\Rhys\Reaction\"
cd C:\Users\Rhys\Reaction
git add -A
git commit -m "Add pre-provisioned user creation"
git push
```

Vercel deploys ~90 sec.

## Test sequence

1. Sign in as admin, go to /admin/users
2. New "Create user" button appears next to the page title
3. Click it → form loads at /admin/users/new
4. Fill in: e.g.
   - Email: supres@plymouth.reaction.org.uk
   - Name: Plymouth SU Demo
   - Organisation: University of Plymouth
   - Account type: Students' Union
   - Demo version: plymouth
   - Password: SomeStrongPassword123
5. Click "Create account"
6. Success card shows the credentials. Click "Copy both" — clipboard now has:
     Email: supres@plymouth.reaction.org.uk
     Password: SomeStrongPassword123
     Sign in: https://reaction.org.uk/auth/signin
7. Click "Done · back to users" — return to /admin/users, see the new user in the list
8. In incognito, visit /auth/signin, switch to Password tab, enter those creds — should sign in and land at /portal
9. The /portal page should let them launch the Plymouth demo
