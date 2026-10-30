# Spiral-Sine ichoTaKu Flagship

A single coherent public surface for the ichoTaKu / TrashCat Radio world:
**Signal → Song → World → Engine → Evidence → Invitation**.

It lives inside the existing `~/ichoTaKu.com` site next to the 62-page atlas.
Nothing in the atlas or in any source folder was changed.

## Run it

```bash
open "Start flagship.command"       # serves ~/ichoTaKu.com on 127.0.0.1:4175
```

or any static server rooted at `~/ichoTaKu.com`:

```bash
cd ~/ichoTaKu.com && python3 -m http.server 4175
# → http://127.0.0.1:4175/flagship-site/
```

The site is dependency-free ES modules — no bundler is required. `package.json`
exists only for an optional `npx vite` run.

## What is inside

| Path | What it is |
|---|---|
| `index.html` | the seven acts of the transmission |
| `css/` | `tokens` (palette + type + motion), `base`, `components`, `sections` |
| `js/spiral-sine.js` | the field: periodic toroidal velocity field, spiral-sine forcing, Jacobi projection, WebGL2 torus renderer + Canvas2D fallback |
| `js/audio.js` | opt-in transmission + AnalyserNode bands |
| `js/site.js` | world tuner, sign-on bookend, meter, field wiring |
| `assets/` | copied art, one audio track, character docs — every entry has an origin in `asset-manifest.json` |
| `scripts/build-assets.sh` | re-copies the assets and rewrites the manifest |

## The field, honestly

A semi-Lagrangian advection scheme on a 64×64 periodic domain, pushed by a
spiral-sine forcing function, diffused for viscosity, projected towards
incompressibility with a 12-iteration Jacobi pressure solve, and rendered as a
displaced torus in WebGL2. Pointer movement injects bounded vorticity; when the
visitor starts the transmission, amplitude and frequency bands bend the forcing.
It is a **fluid-inspired interactive field**, not a research-grade solver.

Fallbacks: no WebGL2 → Canvas 2D projected particle field.
`prefers-reduced-motion` → the pointer vortex is disabled and the field drifts
at 0.18× speed.

## Links out

`../sites/...` (the consolidated source pages), `../index.html` (the 62-page
atlas) and `asset-manifest.json` (provenance) all resolve when the **root**
`~/ichoTaKu.com` is served — that is why the launcher serves the root and not
this folder.

## House rules honoured

- No source folder was modified, moved, renamed or deleted.
- No similar-looking source is called a duplicate.
- Audio is opt-in; nothing autoplays.
- The brush ichoTaKu mark is an image asset, never retyped.
- Only Japanese already present in the station lexicon is used
  (信号を送信 · 放送中 · イチオタク · 自由周波数を生きる者 · コバルト信号).
