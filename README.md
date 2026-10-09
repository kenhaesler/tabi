# tabi · Japan in deinem Tempo

A Japan trip planner: discover places, build a route with nights per stop, then plan days and pick hotels for each stay.
It is a static site (no build step) with a small backend on the host (`/api/trip`, `/api/routing`, `/api/forecast`).

## Run locally

```bash
python3 tools/dev-server.py 8765   # no-store HTTP caching, so edits show up on reload
open http://localhost:8765
```

Locally there is no `/api/*`. Saving falls back to a draft on the device, and live forecasts and timetables show their "not available" states. Everything else works offline after the first visit (service worker).

## Deploy

Upload the whole folder except `_original/`, `docs/` and `tools/`. **Bump `VERSION` in `sw.js` on every deploy.**
The service worker is network-first for app files, so a missed bump never serves stale code. The bump just clears the old offline cache.

## How the frontend is organised

| File | Role |
|---|---|
| `index.html` | App shell: header and main nav, trip bar, panes, sheets, bottom tab bar, icon sprite |
| `css/legacy.css` | **Generated** from `_original/*.css` by `tools/build-legacy-css.py` (colours mapped to theme tokens, `@layer legacy`) |
| `css/app.css` | The design system (`@layer app`): tokens (light and dark), layout, components, motion, view transitions |
| `assets.js` | Lazy loading (`content` = insights, activities and hotels; `pdf` = pdf-lib and export) and Wikimedia thumbnail sizing |
| `app.js` | State, rendering and business rules (route, nights, transfers, day plan, cloud sync, export) |
| `map.js` | Map motion: animated zoom and pan, wheel and pinch, inertia, fit-to-route, hover sync, peek card |
| `ui.js` | Shell: hash router (`#/entdecken`, `#/karte`, `#/route`, `#/aufenthalte`, `…/ort/<id>`), view transitions, sheets (history, drag to dismiss), trip bar, onboarding, share and import, FLIP, theme, service worker |
| `detail-experience.js`, `stay-planner.js`, `season-view.js` | View templates for the place sheet, the stays planner and the season summary |
| `*-data.js`, `destinations.js`, `photos.js` … | Curated content |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installable PWA, offline shell, photo cache |

Cascade layers (`@layer legacy, app`) decide precedence, so there's no `!important` war. To change component styling, edit `css/app.css`. Edit `_original/*.css` and re-run `python3 tools/build-legacy-css.py` only to change the generated base.

### URLs worth knowing

- `#/route/ort/kyoto` opens the Kyoto sheet over the route (deep link; Back closes it).
- `#/route?plan=2026-11-01~2026-11-15~tokyo.4~kyoto.5` is a shared route. The app asks before replacing the current one.

## Rollback

`_original/` holds the prototype exactly as downloaded on 2026-10-05 (HTML, CSS, JS). Serving that folder restores the old frontend. The data files are unchanged.

## Further reading

- `GAP-ANALYSIS.md`: the analysis this overhaul is based on, with implementation status.
- `docs/screenshots/`: before and after.
