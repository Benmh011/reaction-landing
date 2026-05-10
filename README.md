# Site-wide redesign — Phase 1 + 3

Replaces the warm cream/red brand with the new pearl-grey/slate-blue brand,
swaps the type system, removes dark mode, updates the employer demo to match.
Plymouth and Exeter university demos are intentionally untouched (their
brand colours are tied to the universities, not Reaction).

## What's in this bundle

```
app/
  page.tsx          ← NEW landing page (with new MANTRA + FOR UNIVERSITIES sections)
  layout.tsx        ← UPDATED (Newsreader + Inter + JetBrains Mono fonts; light mode forced)
  globals.css       ← REWRITTEN (new tokens, dark mode stripped to a hidden stub)
demos/employer/
  index.html        ← UPDATED (new fonts, blue favicon)
  src/
    index.css       ← UPDATED (Inter body, blue focus state)
    WannaGameBoard.tsx  ← REBRANDED (red → blue throughout)
```

## Brand changes summary

| Element | Old | New |
|---|---|---|
| Primary brand colour | Red `#b91c1c` | Slate blue `#4d6f99` |
| Brand deep accent | (none) | Deep navy `#1a2238` |
| Background | Cream `#f4ede0` | Pearl grey `#e1e4e8` |
| Body font | Geist | Inter |
| Display font | Fraunces | Newsreader |
| Mono font | Geist Mono | JetBrains Mono |
| Theme modes | Light + Dark | Light only |

## Deploy

```
xcopy /E /Y "%USERPROFILE%\Downloads\redesign-bundle\*" "C:\Users\Rhys\Reaction\"
cd C:\Users\Rhys\Reaction\demos\employer
npm run build
cd C:\Users\Rhys\Reaction
git add -A
git commit -m "Site-wide redesign: blue/grey palette, Inter+Newsreader fonts, light-only"
git push
```

Vercel auto-deploys ~90 sec.

## Test sequence

### Landing page
1. Visit `/` — should be pearl grey background, slate blue accents, Newsreader headings
2. Scroll to MANTRA section — deep navy band with three cited problems (loneliness, drinking culture, careers)
3. Each citation has a small arrow icon linking to the source
4. Scroll to WHAT WE DO — three pillars on light grey
5. Scroll to FOR UNIVERSITIES — new section with TEF / A&P language
6. Scroll to CTA — "Bring Reaction to your students"

### Employer demo
1. Sign in as employer user, click into demo
2. Hero panel should be deep navy gradient (was red gradient)
3. "Post a new opportunity" button: white background, blue text (was red text)
4. Stats cards: blue accents
5. "Just posted" badge: blue (was red)
6. Applicant avatar circles: blue gradient (was red gradient)
7. "Review applications" button: blue (was red)
8. "External portal" badge: teal (was a different blue, now distinct from main brand)

### Things to watch for (not breaking, but worth eyeballing)

- **Auth pages** (`/auth/signin`, `/auth/signout`, `/auth/verify-request`): inherit
  new fonts/colours via globals.css. The buttons and forms will look correct
  because they use the standard `.btn`, `.form-input` classes. But layout might
  feel different. Check at least once.
- **Portal page** (`/portal`): same — uses standard classes, should adapt cleanly.
- **Admin pages**: same.
- **SiteNav theme toggle**: NOT removed by this bundle. The toggle button will
  still render but is now styled to `display: none` in CSS, so it's invisible.
  If you want it removed from the JSX too, share the SiteNav.tsx file and we'll
  do a second pass.
- **University demos** (Plymouth, Exeter): completely untouched. They have their
  own bundled CSS so their brand colours are unaffected.

## Known design considerations

1. **The deep navy mantra section is intentionally dramatic** — meant to give weight
   to the cited problem statistics. If it feels too heavy, we can soften the navy.

2. **The new "Reaction" wordmark uses Newsreader with `WONK 1`** — that's the
   slightly stylised italic. If at any point it looks too quirky, drop WONK to 0
   for a cleaner italic.

3. **Citations point to real sources with real dates**. Worth setting a reminder
   to refresh those statistics annually so the page doesn't feel stale.

## Roll back

If something goes seriously wrong, the previous deployment ("Employer demo v2")
in Vercel can be promoted to production via three-dots → Promote.
EOF