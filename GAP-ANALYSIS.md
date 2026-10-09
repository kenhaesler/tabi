# Tabi – Frontend gap analysis

**Date:** 2026-10-05 · **Scope:** the live prototype (`tabi-japan-trip-prototype.kenpachi312.chatgpt.site`) plus the local redesign layer (`modern.css`, `modern.js`) · **Target:** state-of-the-art 2026 web app: modern, smooth, easy to navigate, hard to get lost in.

**How this was measured:** I ran the app in a browser at 390 px (phone), 820 px (tablet) and 1440 px (desktop), with cleared storage for the first-visit checks. I used the browser's Performance API, an axe-core 4.10 accessibility scan and the Web Animations API, and read the source of `app.js`, `stay-planner.js` and all four stylesheets. All numbers below come from those runs.

---

## 0. Implementation status: overhaul of 2026-10-05

The overhaul was guided by user feedback during the work: *"still looks crowded… too much info at once"*. Its leading principle is therefore **one focus per screen, with secondary information on demand**.

**Measured after the overhaul** (same browser method as below):

| | Before | After |
|---|---|---|
| Images on the first phone view | 23 images, 5.8 MB | 17 images, 0.59 MB (right-sized Wikimedia thumbnails plus `srcset`) |
| Scripts needed for first paint | 19, all render-blocking, including the 525 KB PDF engine | 17, all `defer`. The PDF engine loads on export; insights, activities and hotels load after first paint |
| Where the planner starts on a phone | 770 px down (below the fold) | Immediately below a 106 px sticky header and trip bar |
| axe-core violations | 1 rule (contrast) | 0 in 9 scanned states (desktop and phone, light and dark, detail sheet, stays planner) |
| Works offline | No | Yes: the whole app reloads offline after one visit (service worker plus photo cache) |

| ID | Gap | Status |
|---|---|---|
| A1 | URL state, Back button | **Done.** Hash router for views and every sheet. Back closes sheets first, then steps back through views. Deep links such as `#/route/ort/kyoto` work |
| A2 | `history` shadowing | **Done.** Renamed to `undoStack` |
| A3, A4 | Nested tabs, no nav in step 2 | **Done.** One navigation level: Entdecken · (Karte) · Route · Aufenthalte. It's a segmented control in the header on desktop and a tab bar on phones, and it stays visible in every stage |
| A5, A6 | Hero above the fold, no context | **Done.** The hero is replaced by a sticky trip bar (dates, a nights meter with free/over state, season chip, save state). It tucks away while scrolling on phones |
| A7 | No next-step call-to-action | **Done.** "Weiter: Aufenthalte gestalten" appears once the route has stops, and is emphasised when the nights balance |
| A8 | Silent demo route | **Done.** A welcome sheet offers "example route" or "empty route", and a "Beispielroute" banner shows until the route is changed |
| A9 | List ↔ map | **Done.** Card hover highlights the place on the map, pin hover highlights the card, and tapping a pin opens a peek card instead of a modal |
| B1, B2 | View transitions, card → detail continuity | **Done.** Slides between views (on desktop only the side panel moves) and the card photo morphs into the sheet hero |
| B3 | Map motion | **Done.** Animated zoom and pan, wheel and trackpad zoom at the cursor, pinch, inertia, double-tap, fit-to-route, home view fitted to all of Japan, labels and strokes at a constant screen size |
| B4 | Reorder and remove motion | **Done.** FLIP on every route render; only new stops animate in |
| B5 | Route drawing | **Done.** Curved legs, a flowing dash, draw-in when the route changes |
| B6, B7 | Dialog transitions, draggable sheet | **Done.** Native `@starting-style` enter and exit (the monkey patch is gone), bottom sheets with a grabber and drag-to-dismiss on phones |
| B8 | Endless shimmer | **Done.** Shimmer only behind photos that haven't loaded yet |
| B9 | Scroll polish | **Done** (in JS): the header hairline, and the trip bar collapsing while scrolling on small screens |
| C1 | Four fighting stylesheets | **Done.** `@layer legacy, app`; the legacy layer is generated with colours mapped to tokens. No `!important` war |
| C2 | Dark mode | **Done.** Auto, light or dark from the ⋯ menu, applied before first paint |
| C3 | Flat map | **Partly done.** Fitted home view, all 69 places as quiet dots, curved routes, hover halo. Relief shading and clustering are still open |
| C4 | Imagery | **Done.** Full-bleed detail hero with title, photo cards on tablet, welcome hero |
| C5 | Icons | **Done.** One inline SVG sprite for the shell (content links keep their ↗) |
| C6 | Stays planner | **Done** (restyled, not rewritten): stay chips, one strip with every day, timeline, idea cards, hotel cards |
| C7 | Type scale | **Done** in tokens and components |
| D1 | Map scroll trap | **Done.** The phone map view is a fixed-height screen with nothing to scroll behind it |
| D2 | Add feedback | **Done.** The photo flies into the route tab and the badge bumps |
| D3 | Swipe between tabs | **Not done.** It conflicts with horizontal chip and strip scrolling; left out deliberately |
| D4 | Date range picker | **Not done.** Native date inputs inside the trip sheet |
| E1, E2 | Thumbnails, blocking scripts | **Done** (see the table above) |
| E3 | Caching | **Partly done.** The service worker gives repeat visits and offline use. The host still sends `no-cache` |
| E5 | Own image CDN | **Not done.** Photos are still served from Wikimedia (cached by the service worker) |
| F1, F2 | Build step, component layer | **Not done, deliberately.** The overhaul keeps the vanilla architecture so the domain logic (cloud sync, export, stays planner) stays untouched and reviewable. FLIP and observers cover the motion gaps. This remains the next structural step |
| G1–G4 | Accessibility | **Done.** One `h1`; navigation is announced, and keyboard navigation moves focus to the new view's heading; contrast is fixed in both themes. Touch targets are ≥ 40 px (44–54 px on list actions, sheets and the tab bar; map pins have 44 px hit areas) |
| H1–H3 | PWA, offline, sharing | **Done.** Manifest and icons, offline shell plus photo cache, share link with an import sheet (`#/route?plan=…`) |
| H4 | English | **Not done** |

---

## 1. Verdict

The redesign layer fixed most of the surface: typography, cards, header, bottom tab bar, bottom sheets and spacing. The remaining gaps are structural. **Navigation has no memory, motion has no continuity, and the render model fights both.** The app rebuilds whole lists with `innerHTML` on every change and keeps view state outside the URL. That combination is why it still feels like a prototype: nothing moves *from* somewhere *to* somewhere, and the back button doesn't work inside the app.

| Dimension | Before redesign | Now | Target | Biggest remaining gap |
|---|:-:|:-:|:-:|---|
| Visual design | 2 | 3.5 | 5 | Four competing stylesheets, no dark mode, flat map |
| Motion & transitions | 1 | 2.5 | 5 | No transitions between views; map zoom jumps |
| Navigation & orientation | 2 | 2.5 | 5 | No URL state, back button leaves the app, 3 nested tab layers |
| Mobile UX | 1.5 | 3.5 | 5 | Hero pushes the planner below the fold; map traps scrolling |
| Performance | 2.5 | 2.5 | 5 | 5.8 MB of images in the first view, 19 render-blocking scripts |
| Accessibility | 3.5 | 4 | 5 | Good base; motion and focus handling need work |
| Platform (PWA, share, offline) | 0 | 0 | 4 | None of it exists |
| Maintainability | 1.5 | 1.5 | 4 | Override cascade, global scripts, full re-renders |

(1 = poor, 5 = state of the art)

---

## 2. Fixed in this session

| Issue | Evidence | Fix |
|---|---|---|
| One "add" tap replayed every entrance animation | 148 concurrent animations after one click; both lists are rebuilt with `innerHTML` | `modern.js` now animates only a changed result set or a newly added stop. Now about 10 animations (the pop and the toast). |
| Rebuilt photos faded in again on every change (flicker) | `img.place-photo` restarted at `opacity:0` | The fade is suppressed during state-only re-renders |
| Contrast failure | axe: `--muted` on paper was 4.45:1 (AA needs 4.5:1) | `--muted` changed to `#52666c` |

---

## 3. Gaps by dimension

Priority: **P0** fix now · **P1** next iteration · **P2** polish or strategic. Effort: S < ½ day · M 1–3 days · L > 1 week.

### A. Navigation & orientation ("don't get lost")

This dimension matters most for your goal.

| # | Gap | Evidence | Impact | Fix | Pri | Effort |
|---|---|---|---|---|:-:|:-:|
| A1 | **No URL state.** Tabs, planning step and open place are not in the URL. | `history.length` didn't grow after a tab switch plus opening a detail; `location.hash` stays empty; no `pushState`/`popstate` anywhere | The back button leaves the site. A reload drops you back on "Orte". Nothing can be shared or bookmarked. This is the main "I'm lost" cause. | Hash or path router: `#/route/map`, `#/place/kyoto`, `#/stays/tokyo/day-2`. Back closes the sheet, then goes to the previous tab. | **P0** | M |
| A2 | `let history=[]` (the undo stack) in `app.js` shadows `window.history` in global scope | `app.js`: `let history=[],filter='all'…` | Any router written as a classic script will call `.pushState` on the undo array and crash | Rename it to `undoStack` before adding routing | **P0** | S |
| A3 | **Three nested tab systems.** Steps (Route/Stays), then view tabs (Orte/Karte/Route), then stay tabs (Tage/Unterkunft/Ansehen) plus a day picker. | Visible in screenshots | High cognitive load; users lose track of which level they are on | Fold the steps into the main navigation as one level: **Entdecken · Karte · Route · Aufenthalte**. On mobile that's 4 tabs in the bottom bar; on desktop a segmented control in the header. | **P0** | M |
| A4 | **Step 2 on mobile has no persistent navigation** | `switchPlanningStage` sets `.mobile-tabs.hidden=true` | In the stay planner, getting back means scrolling to the top | Covered by A3: the bottom bar stays visible in every stage | **P0** | S (with A3) |
| A5 | **Hero pushes the tool below the fold** | Phone: the workspace starts at **770 px** in an 844 px viewport, after dates, preferences, climate card, disclaimer, steps and save bar | The first impression is a form and a weather report, not the trip | Collapse the hero into a sticky **trip summary bar** (`1.–15. Nov · 14 Nächte · 4 Orte`, tap to edit as a sheet). Move climate into its own card or route insights. Move disclaimers into a footer or info sheet. | **P0** | M |
| A6 | **No "where am I in the trip" context while scrolling** | Dates and night balance scroll away; only the badge shows a count | Users lose sight of dates and how many nights are still unassigned | The sticky trip summary from A5 includes a nights-assigned meter (`12/14 Nächte`) | P1 | S |
| A7 | **No next-step call-to-action** | The route footer only has "Beispielroute laden". When all nights are assigned there's no "Weiter: Aufenthalte gestalten". | The two-step flow is invisible; step 2 is hard to discover | Contextual CTA once the route is valid; also a CTA in the toast after the 2nd/3rd stop | P1 | S |
| A8 | **First visit silently preloads a 4-stop demo route** | Cleared storage gives 4 stops (`stops:demoRoute()`) | "Did I add these?" A wrong mental model from second one. The "Beispielroute laden" button becomes redundant. | Either start empty with a short onboarding ("Start with an example route?") or label it visibly: "Beispielroute · ersetzen". | P1 | S |
| A9 | **List and map don't talk to each other** | Hovering a card doesn't highlight its pin; tapping a pin opens a modal instead of focusing the card | Users can't connect "this place" with "there" | Hovering or focusing a card highlights its pin; tapping a pin shows a peek card. On mobile, a map with a list in a draggable bottom sheet (Google/Apple Maps pattern). | P1 | M |
| A10 | **No search feedback or empty-filter recovery beyond reset** | "Noch kein Treffer" with a reset button only | Fine but minimal | Suggestions such as "Meintest du…", nearby or related places | P2 | S |

### B. Motion & transitions ("smooth")

| # | Gap | Evidence | Impact | Fix | Pri | Effort |
|---|---|---|---|---|:-:|:-:|
| B1 | **No transitions between views** (tabs, steps) | Panes switch by `display` toggle; only a CSS fade-up on appear. No `startViewTransition` anywhere. | Feels like page swaps, with no spatial model | **View Transitions API** (same-document, supported in all major browsers): horizontal slide between tabs, cross-fade between steps | **P0** | S |
| B2 | **No continuity from card to detail** | The detail opens as a generic sheet | The photo you tapped "disappears" | Shared-element transition: the card photo morphs into the hero image (`view-transition-name` per place) | P1 | M |
| B3 | **Map zoom and pan jump** | `updateMapView` sets `viewBox` instantly; zoom only in integer steps; no wheel or pinch zoom; no inertia | The map feels like a static image, which matters most for a travel app | Animated viewBox tween (rAF), wheel/trackpad zoom around the cursor, two-finger pinch, fling inertia, "fly to place" when a place is selected | **P0** | M |
| B4 | **No FLIP animation when reordering or removing stops** | The route list is rebuilt; items just appear in their new place | Reordering is hard to follow | Keyed render plus FLIP (or View Transitions with `view-transition-name` per stop) | P1 | M |
| B5 | **Route line has no draw-in on change**; numbers don't animate | `route-line` animates only on first render | Missed delight | Animate the new segment with `stroke-dashoffset`; animate the totals counting up | P2 | S |
| B6 | **Dialog exit animation relies on a monkey-patched `close()`** | `modern.js` overrides `HTMLDialogElement.close` | Fragile | Use `@starting-style` plus `transition-behavior: allow-discrete` for native enter and exit, and remove the patch | P1 | S |
| B7 | **Bottom sheet can't be dragged** | No drag-to-dismiss or snap points | Users try to swipe it down out of habit | Pointer-driven drag handle with snap points (peek, half, full) | P1 | M |
| B8 | **Infinite shimmer on lazy images that are never scrolled into view** | 112 ambient animations still running 2 s after load; `background-position` repaints | Battery and CPU use on phones | Shimmer only while in view (IntersectionObserver), or a static LQIP blur instead | P2 | S |
| B9 | **No scroll-driven polish** | — | Header, hero and map could respond to scroll | `animation-timeline: scroll()` to shrink the header or fade the hero, without JS | P2 | S |

### C. Visual design ("nice to look at")

| # | Gap | Evidence | Impact | Fix | Pri | Effort |
|---|---|---|---|---|:-:|:-:|
| C1 | **Four stylesheets fighting** | `style.css`, `readability.css` (patches), `stay-planner.css`, `modern.css` with **59 `!important`** | Every tweak needs a stronger override; the visuals drift | Consolidate into one token-based stylesheet using `@layer reset, tokens, base, components, utilities` | **P0** | M |
| C2 | **No dark mode** | 0 `prefers-color-scheme` rules | Expected in 2026, especially for evening trip planning | Tokens through `light-dark()` plus a toggle | P1 | M |
| C3 | **The map is the hero but looks flat** | Single land polygon, dotted water, tiny labels; Japan fills about 40% of the pane on phones | The most emotional surface is the weakest | Auto-fit the route bounds, soft relief or terrain shading, region labels on zoom, pin clusters, photo pins for route stops | P1 | M–L |
| C4 | **No imagery-led moments** | Photos appear only as 84 px thumbnails | Japan sells itself visually, but the app doesn't use it | Large photo cards for "featured" places, a full-bleed hero in the detail view, a mood image per season | P1 | S–M |
| C5 | **Inconsistent icon set** | A mix of inline SVG paths, text arrows (`↗`, `▶`) and a CSS chevron | Looks assembled | One icon set (e.g. Lucide, inline-sprited); replace the text glyphs | P2 | S |
| C6 | **Stay planner (step 2) only skinned** | It inherits tokens, but the layout is unchanged: dense form UI, day picker as a `<select>` | Step 2 feels like a different, older app | Redesign it as a horizontal day timeline (swipeable day cards), with hotels as photo cards | P1 | L |
| C7 | **Typography scale is ad hoc** | Sizes are scattered across 4 files | Rhythm breaks between sections | A type scale in tokens (`--step--1 … --step-5`, fluid `clamp()`) | P2 | S |

### D. Mobile specifics

| # | Gap | Evidence | Impact | Fix | Pri | Effort |
|---|---|---|---|---|:-:|:-:|
| D1 | **The map traps page scrolling** | `.map-wrap svg{touch-action:none}` (original) on a map that is now up to 62 dvh tall | A thumb on the map can't scroll the page, which feels broken | One finger scrolls the page and two fingers pan/zoom (with a hint), or make the map a fixed full-screen view with nothing to scroll | **P0** | S |
| D2 | **Adding from the list gives weak feedback** | A toast plus the badge bump | It's unclear where the place went | A "fly to tab" micro-animation of the thumbnail into the route tab; haptic tick (`navigator.vibrate(10)`) on Android | P2 | S |
| D3 | **No swipe between tabs** | — | Native apps have trained this gesture | Horizontal swipe on the content area, combined with B1 | P2 | M |
| D4 | **Date entry uses native inputs in a compact pill** | Works, but there's no range-picker feel | Picking a range takes two separate pickers | A range calendar sheet with one interaction for arrival and departure | P2 | M |

### E. Performance

| # | Gap | Evidence | Impact | Fix | Pri | Effort |
|---|---|---|---|---|:-:|:-:|
| E1 | **Thumbnails about 11× too large** | The first phone view loads 23 images totalling **5.8 MB**; Wikimedia `960px-` thumbs are shown at about 84 px (×2 DPR) | Slow on mobile data, and the main reason the list feels heavy | Request `250px-`/`330px-` thumbs plus `srcset`/`sizes`. **Changing the URL width is about a one-line change** | **P0** | S |
| E2 | **19 render-blocking scripts (1.6 MB raw, about 370 KB gzipped)** | Synchronous `<script>` tags; `pdf-lib.min.js` (525 KB) and `destination-insights.js` (356 KB) load before first use | Long parse time on mid-range phones; the PDF library loads even if no one exports | `defer` all scripts; lazy-load `pdf-lib` on export and the insights/activities on first detail open (dynamic `import()`) | **P0** | S–M |
| E3 | **No caching** | Live host returns `cache-control: no-cache` for every asset | Every visit revalidates 20+ files | Content-hashed filenames plus `immutable` caching (needs a build step or the host's settings) | P1 | S |
| E4 | **Full re-render on every change** | Every commit rebuilds the place list (69 cards), the route, the map and the season card | Hurts responsiveness as data grows | Keyed diffing (see F2) | P1 | L |
| E5 | **Images hot-linked from Wikimedia** | `thumb.wikimedia.org`, `referrerpolicy=no-referrer` | Depends on a third-party CDN; no AVIF/WebP control | Proxy or cache through the host's own CDN with AVIF and responsive sizes | P2 | M |

### F. Architecture & maintainability (what blocks "state of the art")

| # | Gap | Evidence | Impact | Fix | Pri | Effort |
|---|---|---|---|---|:-:|:-:|
| F1 | **Global classic scripts, no modules, no build** | 19 globals on `window` | No tree-shaking or code splitting; name collisions (A2) | Vite plus ES modules; keep the data files as JSON chunks | P1 | M |
| F2 | **`innerHTML` string templates as the render model** | All views are template strings | Prevents FLIP, shared-element and focus-preserving updates; there's risk of XSS slips (`esc()` must be called manually) | Move to a light component layer (Preact/Svelte/Lit) with keyed lists, or at least morphdom-style patching | P1 | L |
| F3 | **The redesign layer depends on DOM-observer hacks** | `modern.js` uses MutationObservers to fight re-renders (badge, animation suppression, photo fade) | Works, but it's brittle | Disappears once F2 lands | P2 | — |

### G. Accessibility

The baseline is solid: axe found 1 issue type, now fixed. Remaining items:

| # | Gap | Fix | Pri | Effort |
|---|---|---|:-:|:-:|
| G1 | Two `<h1>` elements (hero and stay planner) | One `h1` per stage; demote the other | P2 | S |
| G2 | Focus can be lost when lists are rebuilt (`restoreControl` patches it) | Keyed render (F2) preserves focus naturally | P1 | — |
| G3 | View changes aren't announced | After a View Transitions switch, move focus to the pane heading and announce the tab via `aria-live` | P1 | S |
| G4 | Map pins need ≥ 44 px touch targets at every zoom level (they're computed as `22/scale`) | Clamp the hit target to a minimum CSS-pixel size | P2 | S |

### H. Platform features

| # | Gap | Fix | Pri | Effort |
|---|---|---|:-:|:-:|
| H1 | No web app manifest or installability | `manifest.webmanifest`, icons, `display: standalone` | P1 | S |
| H2 | No offline support (the itinerary isn't available in Japan without signal) | A service worker caching the app shell plus the user's trip and photos | P1 | M |
| H3 | No sharing | Share link (from A1) plus `navigator.share` on mobile | P1 | S |
| H4 | German only | i18n string table (EN for companions) | P2 | M |

---

## 4. Roadmap

### Sprint 1: "Don't get lost" (about 1 week, highest impact)
1. **E1** Smaller thumbnails (instant 5 MB saving)
2. **E2** `defer` plus lazy-load `pdf-lib` and the insights
3. **A2** Rename `history`, then **A1** a hash router (tabs, step, place, back-button behaviour)
4. **A3 + A4** One navigation level: Entdecken · Karte · Route · Aufenthalte
5. **A5 + A6** Sticky trip summary bar; slim hero
6. **B1** View Transitions between tabs and steps
7. **D1** Fix map scroll trapping
8. **A7, A8** Next-step CTA; honest demo-route onboarding

### Sprint 2: "Smooth & beautiful" (about 1–2 weeks)
- **B3** Animated, pinch- and wheel-zoomable map with fly-to; **A9** list↔map sync
- **B2** Shared-element card → detail; **B7** draggable sheet; **B6** native dialog transitions
- **C1** Consolidate CSS into `@layer` tokens; **C2** dark mode
- **C4, C6** Imagery-led cards; redesign the stay planner as a day timeline
- **H1–H3** PWA manifest, offline trip, share

### Sprint 3: Foundations (2–3 weeks; makes the above sustainable)
- **F1** Vite plus modules; **F2** component layer with keyed rendering (unlocks B4 and G2)
- **E3, E5** Caching strategy and an image pipeline
- **C3** Richer map (auto-fit, relief, clustering, photo pins)

---

## 5. Not covered by this analysis
- Real devices (iOS Safari bottom-bar behaviour, Android back gesture). I used emulated viewports only.
- The authenticated backend (`/api/trip` sync, conflicts, live routing and forecasts). It returns 401 or 404 locally.
- The deeper flows of the stay planner (hotel selection, day items) and the PDF export output.
- Throttled-network and CPU profiling. The page-load timings were taken on localhost and aren't representative.
