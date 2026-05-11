# Plymouth demo fixes — society alignment, modal cleanup, Pair label

Three integrity fixes for the Plymouth demo's post system.

## What's in this bundle

```
demos/plymouth/src/WannaGameBoard.jsx   ← UPDATED (~75 net new lines)
```

## Changes

### Fix 1 — Society/activity alignment

**Data (seed posts fixed):**
- Drama Society posting Rugby → now Student
- Geography Society posting Cricket → now Student  
- Education Society (didn't exist in society list) posting Football → now Student
- Engineering Society (didn't exist) posting Group Revision → now Architecture Society (PARCS)

**Logic (new map):**
Added `SOCIETY_CATEGORIES` map defining which categories each society can post in.
Sport is intentionally excluded for ALL societies — sport posts come from students.
Community is allowed for all societies (fundraising/volunteering is universal).
Other categories are matched to society purpose (e.g. Tabletop Gaming Society can
post Board Games + Community; Computing Society can post Study + Board Games +
Community).

**UI behaviour:** When admin/user selects 'Societies' as the poster and the
chosen category is Sport, a warning appears explaining societies can't post
sport. When in any other category, the society dropdown filters to only show
relevant societies.

### Fix 2 — Post modal cleanup

**Visual:**
- Category buttons restyled cleaner — solid navy when active, white/grey when not. 
  No more gradient blur, no more chunky shadows.
- Buttons now use CSS grid for even spacing (was flex-wrap which created uneven rows).

**Behavioural:**
- Modal now accepts `allowedCategories` prop.
- When opened from Campus board → shows Sport / Study / Board Games only
- When opened from Community board → shows Community only
- When opened from Opportunities board → shows Opportunities only
- Default category pre-fills appropriately based on which board you were on.

### Fix 3 — "1v1" rename to "Pair"

Two render sites updated:
- The mode badge in the create modal: was "1v1 / Pair", now "Pair"  
- The mode display in the post card: was "1v1", now "Pair"

Data model unchanged — `mode: '1v1'` is still the internal value (used to compute 
maxPeople=2 and other logic). Only the user-facing string changed.

This fixes the "Lab Partner / 1v1" confusion: Lab Partner is still a pair-mode
activity (you need ONE partner), but now reads as "Pair" which is unambiguous
across Sport, Study, and Board Games contexts.

## Deploy

```
xcopy /E /Y "%USERPROFILE%\Downloads\plymouth-fixes\*" "C:\Users\Rhys\Reaction\"
cd C:\Users\Rhys\Reaction\demos\plymouth
npm run build
cd C:\Users\Rhys\Reaction
git add -A
git commit -m "Plymouth: society/category alignment, modal cleanup, Pair label"
git push
```

Vercel auto-deploys ~90 sec.

## Test sequence

1. Sign in to Plymouth demo
2. **Visual check** — scroll posts. Confirm:
   - No Sport posts show a society badge (they're all student-posted now)
   - Lab Partner post shows "Pair" not "1v1"
   - Tennis / Badminton / Chess all show "Pair"
3. **Modal check (Campus board)** — click + New Post while viewing Campus:
   - Category buttons show: Sport · Study · Board Games (NO Community, NO Opportunities)
   - Buttons look clean (solid colours, no gradient blur)
   - Pick Sport, select Societies as poster — see warning explaining societies can't post sport
   - Switch to Study, select Societies — society dropdown only shows Study-eligible societies
4. **Modal check (Community board)** — navigate to Community board, click + New Post:
   - Category buttons show: Community only
5. **Modal check (Opportunities board)** — same for Opportunities

## Known limitation

The Opportunities board still allows users to post — in a real product these
would be employer-only. For demo purposes we kept it open. If you want to lock
it down too, easy follow-up: change the LANDING_SECTIONS to mark some as 
"read-only" and hide the + New Post button on those boards.
