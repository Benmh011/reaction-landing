# Reaction Demo Builds

This folder contains the bespoke demo builds that get bundled and served at `/demos/<slug>/` on reaction.org.uk.

## Folder structure

```
demos/
├── exeter/              ← Exeter-themed demo
│   ├── src/
│   │   ├── main.jsx             ← React entry point
│   │   ├── WannaGameBoard.jsx   ← The actual app (copy of the JSX)
│   │   └── index.css            ← Tailwind base
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── plymouth/            ← (planned) Plymouth-themed
└── general/             ← (planned) Generic demo
```

Each demo is its own self-contained Vite project. They share no code yet — for 2-3 variants this is fine. If we ever get to 10+ universities we'd refactor to a shared base + per-variant config.

## Building a demo

```bash
cd demos/exeter
npm install         # first time only
npm run build
```

The build writes to `../../public/demos/exeter/`. Vercel picks it up automatically on the next push to GitHub because anything in `public/` is served as static files at the matching URL.

## Local dev (optional)

```bash
cd demos/exeter
npm run dev
```

Opens at `http://localhost:5173/demos/exeter/`. Hot-reloads on file changes. Useful when polishing a variant before deploying.

## Adding a new university (Plymouth, etc.)

1. Copy the entire `exeter/` folder to e.g. `plymouth/`
2. In the new folder, edit `vite.config.js` — change `base` and `outDir` to use the new slug
3. Edit `index.html` — change `<title>` and the `src` path on the script tag to the new slug
4. Edit `src/WannaGameBoard.jsx` — find/replace all Exeter-specific copy, locations, partner names, brand colours
5. Build: `cd plymouth && npm install && npm run build`
6. Push to GitHub
7. In the Reaction admin panel, set the user's `demoVersion` to `plymouth`

## Important notes

- Each demo has its own `node_modules` — npm install per folder. Hard-disk hungry but keeps versions isolated.
- The build output (`public/demos/<slug>/`) IS committed to git. This means git history grows over time. For our scale, fine. If it ever gets unwieldy we'll move builds out of git.
- Demos use React 18 (Vite-friendly). The main Next.js app uses React 19. They're separate runtime trees so no conflict.
- No `index.html` redirect is needed — visiting `/demos/exeter/` automatically serves `/demos/exeter/index.html` due to Vercel's static file conventions.
