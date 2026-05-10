# Fictionalise demo company names

Replaces real Plymouth/Devon-area company names in all three demos with
plausibly-real fictional names. Adds a small disclaimer at the foot of each
demo. Public bodies (City Council, County Council) and university names
remain real.

## What's in this bundle

- demos/exeter/src/WannaGameBoard.jsx (UPDATED)
- demos/plymouth/src/WannaGameBoard.jsx (UPDATED)
- demos/employer/src/WannaGameBoard.tsx (UPDATED)

## Name changes applied where present

Princess Yachts -> Tamar Marine Yachts
Plymouth Marine Laboratory -> Sound Marine Research Institute
South West Water -> West Devon Water Co
Plymouth Argyle FC -> Devonport Athletic FC
Plymouth Science Park -> Saltash Innovation Centre
Babcock International -> Tamar Defence Engineering
Met Office -> South West Climate Centre
EDF Energy -> Devon Power Partners
Pennon Group -> Westcountry Holdings
Lloyds Banking Group -> Westbridge Banking Group
Argyle Community Trust -> Devonport Community Trust
Plymouth Energy Community -> Tamar Energy Cooperative
Shekinah Mission / St Petrock's -> Plymouth Outreach Network
Mind Devon -> Devon Wellbeing Network
Livewell Southwest -> Westcountry Care Network
Age UK Plymouth -> Plymouth Elder Connect
Age UK Exeter -> Exeter Elder Connect
Devon Wildlife Trust -> Devon Nature Trust
Exeter Community Energy -> Exeter Energy Cooperative
Exeter City Community Trust -> Devon Community Trust
Exeter Science Park -> Exeter Innovation Park

## Deploy

xcopy /E /Y "%USERPROFILE%\Downloads\fictional-bundle\*" "C:\Users\Rhys\Reaction\"

Then rebuild each demo:

cd C:\Users\Rhys\Reaction\demos\exeter
npm run build

cd C:\Users\Rhys\Reaction\demos\plymouth
npm run build

cd C:\Users\Rhys\Reaction\demos\employer
npm run build

Then push:

cd C:\Users\Rhys\Reaction
git add -A
git commit -m "Fictionalise company names across all three demos"
git push
