# Plymouth societies v2 — proper society/activity alignment

Three structural changes to make society posts feel realistic.

## What's in this bundle

```
demos/plymouth/src/WannaGameBoard.jsx   ← UPDATED (~185 net new lines)
```

## What changed

### 1. New society list — 27 societies / clubs (was 17)

Sport-specific clubs added so they can actually post their sport:
- Basketball Club · Football Club · Rugby Union Club · Tennis Club
- Badminton Club · Cricket Club · Volleyball Club

Board game specifics added:
- Chess Society (was missing entirely)
- Poker Society (was implicit in Tabletop)
- Tabletop Gaming Society (existing, now covers Catan / Risk / Monopoly / Scrabble / D&D)

Academic + general societies kept, plus added: Plymouth Night Patrol (a real Plymouth-specific society) and a few academic ones aligned with course offerings.

### 2. Society → activity restrictions (not category)

Replaced the previous `SOCIETY_CATEGORIES` map with `SOCIETY_ACTIVITIES`:
- Tennis Club → can post Tennis (and Tennis Taster Session)
- Chess Society → can post Chess (and Chess Taster Session)
- Tabletop Gaming Society → Catan / Risk / Monopoly / Scrabble / D&D + their Tasters
- Academic societies (Computing, Law, Psychology etc.) → Community only
- Drama / Music / Photography → Community only
- All societies can ALWAYS post Community activities (Volunteering, Fundraising, Social Events, Campaigns)
- Study posts are student-only — Study isn't a society-led category

### 3. Taster Sessions — new activity variant

Sport clubs and Board Game societies can post "[Activity] Taster Session" variants.
Tasters force `group` mode regardless of the parent activity's mode — so the Tennis 
Club can run a 12-person intro instead of being capped at 2 (pair mode). Display label:
"Tennis — Taster Session".

### Modal behaviour now

When you click "+ New Post" and select "Societies" as poster:
- Society dropdown filters to only societies eligible for the current category
- If Sport: shows only sport-specific clubs
- If Board Games: shows Chess Soc, Tabletop, Poker Soc
- If Community: shows ALL societies
- If Study: warns "Study posts come from students" and disables society mode
- Activity dropdown filters to only activities that society can post
- Taster Session variants appear automatically for Sport + Board Games

### Reseed of sport posts

12 sport posts total (was 9):
- 3 student-posted casual (Basketball, Tennis pair, Badminton pair)
- 3 staff-posted (Football, Volleyball, Basketball lunchtime)
- 3 society-posted training (Rugby Union Club, Cricket Club, Football Club)
- 3 Taster Sessions (Tennis Club, Basketball Club, Volleyball Club)

### Reseed of board game posts

9 board game posts total (was 7):
- 4 society-posted (Chess Soc, Tabletop x2, Poker Soc)
- 1 student-posted (Monopoly night, Scrabble)
- 2 Taster Sessions (Chess Society, Tabletop Gaming Society)

## Deploy

```
xcopy /E /Y "%USERPROFILE%\Downloads\plymouth-societies-v2\*" "C:\Users\Rhys\Reaction\"
cd C:\Users\Rhys\Reaction\demos\plymouth
npm run build
cd C:\Users\Rhys\Reaction
git add -A
git commit -m "Plymouth: society→activity restrictions, Taster Sessions, expanded society list"
git push
```

Vercel auto-deploys ~90 sec.

## Test sequence

1. Sign in to Plymouth demo
2. **Visual sweep — existing posts:**
   - Rugby post should now attribute to Rugby Union Club (not Drama)
   - Cricket post → Cricket Club (not Geography)
   - Women's football → Football Club (not Education)
   - Tennis Taster shows "Tennis — Taster Session", 12 max people
3. **Create a Sport post:**
   - Click + New Post on Campus board
   - Select Sport, click Societies
   - Society dropdown shows only sports clubs
   - Pick "Tennis Club" — activity dropdown shows "Tennis" + "Tennis — Taster Session"
   - Pick the Taster — max people becomes group-sized (6+ default)
4. **Create a Board Game post:**
   - Same flow, Board Games + Societies
   - Pick "Chess Society" — activity dropdown shows "Chess" + "Chess — Taster Session"
   - Pick "Tabletop Gaming Society" — dropdown shows Catan/Risk/Monopoly/Scrabble/D&D + their Tasters
5. **Study + Societies:**
   - Switch to Study, click Societies
   - Warning appears explaining study posts are student-only
6. **Community + Societies:**
   - Switch to Community, click Societies
   - All societies available
   - All 4 community activities available regardless of which society

## Known limitations

- The Opportunities board still allows user posts. In a real product these would be employer-only.
- Taster Sessions only exist for Sport + Board Games. If you ever want Community-style Taster Sessions, easy to extend.
