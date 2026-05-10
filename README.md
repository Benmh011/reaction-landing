# Personalised welcome on Plymouth demo

Replaces the hardcoded "Welcome, Rhys" with the actual user's first name.
Works by passing the name through the URL hash from /portal to the demo,
same pattern the employer demo already uses for organisation name.

## What's in this bundle

```
app/portal/page.tsx                      ← UPDATED (appends firstName to URL hash)
demos/plymouth/src/WannaGameBoard.jsx    ← UPDATED (reads firstName from hash)
```

## How it works

1. User signs in to Reaction (real magic-link OR pre-provisioned password)
2. They land at /portal
3. /portal's "Launch demo" button now builds a URL like:
     /demo-app/plymouth/#firstName=Rhys
4. They click → Plymouth demo loads
5. When they "sign in" inside the demo's own login modal, handleLogin now
   reads firstName from the URL hash instead of hardcoding it
6. The welcome badge top-right reads "Welcome, Rhys" (or whatever their
   real first name is)

If the demo is opened directly (without going through /portal), firstName
falls back to "there" — so the demo still functions for testing.

## Deploy

```
xcopy /E /Y "%USERPROFILE%\Downloads\welcome-fix\*" "C:\Users\Rhys\Reaction\"
cd C:\Users\Rhys\Reaction\demos\plymouth
npm run build
cd C:\Users\Rhys\Reaction
git add -A
git commit -m "Personalise welcome on Plymouth demo"
git push
```

Vercel auto-deploys ~90 sec.

## Test

1. Sign in as a user whose Name field is something other than "Rhys"
   (e.g. create a fresh pre-provisioned account with name "Sam Test")
2. Land on /portal
3. Click "Launch demo" — Plymouth demo loads
4. Inside the demo, complete its sign-in modal
5. Top-right of the demo should read "Welcome, Sam" (not "Welcome, Rhys")

## A heads-up

The Plymouth demo has its OWN login modal inside the demo, which is an
artefact from the original prototype. Users have to sign in twice — once
to Reaction, once to the demo itself. That's a separate fix; the welcome
fix here just makes sure the second sign-in shows the right name.
