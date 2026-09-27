# Portfolio Revamp Plan: "Make the Deck Alive"

> **Status (Sep 27, 2026): built on branch `revamp`, not committed.**
> **Direction change:** partway through, the look moved from the Switch dashboard to a **Game Boy handheld**, to make the site feel less AI-generated.
> - The whole site is now a console: a GBA-style landscape shell on desktop and a DMG portrait on mobile, with clickable D-pad, A/B, START/SELECT and a power switch.
> - The screen is an LCD. Every 3D canvas is pixelated, Bayer-dithered and mapped onto a 4-shade palette (DMG / Pocket / Ice Cream / Color / Light backlight, plus a secret Virtual palette unlocked by the Konami code).
> - Pixel fonts throughout (Press Start 2P, Pixelify Sans, VT323), with pixel-sprite icons and cursor.
> - GB boot scroll with the "ba-ding" chime; a cartridge-insert launch that zooms into the screen.
> - Project pages are Pokémon-style summaries (INFO / MOVES / LINKS, HP-bar stats, typewriter text box). The menu has OPTIONS / BAG / TRAINER / BADGES pages.
> - **Cut** because they read as AI-generic: the shader background blobs, particle boot, bloom and glow cursor ring.
> - Everything below still applies, re-skinned. Item status: ✅ built · ✂️ cut.

Every item has an ID (e.g. `B3`). To give feedback, mark items **keep / cut / change** or add your own ideas under each section.
Effort: **S** = hours, **M** = about a day, **L** = several days.

---

## 0. Where things stand today

What's already built (Next 14 static export → GitHub Pages, React 18, framer-motion, Tailwind):

| Piece | File | Today |
|---|---|---|
| Boot | `BootSplash.js` | "GA" logo scales in, fades out after 1.4s |
| Background | `AmbientBackground.js` | 3 blurred CSS blobs, mouse parallax |
| Dashboard | `page.js` | White rounded panel, header (avatar + 7 round icon buttons), footer (clock/wifi/battery, A/B buttons) |
| Carousel | `TileCarousel.js`, `Tile.js` | 12 gradient tiles on a 2D arc, a tilt effect on the active tile, glass "EXPERIENCE / PROJECTS" dividers |
| Launch | `WarpPipeTransition.js` | Green pipe rises, tile falls in, white flash |
| Detail | `GameModal.js` | Gradient hero plus a scrolling text body, GitHub stars fetched live |
| Settings | `SettingsModal.js` | Skills and extra info as chip lists |
| Sleep | `SleepOverlay.js` | CSS 3D cube and name bounce DVD-style |
| Games | `BlockDropGame.js`, `PixelJumperGame.js` | Canvas 2D mini-games |
| Sound | `useSoundEngine.js` | Web Audio synthesized blips (no audio files) |

**What makes it feel static right now**
- Tiles are flat gradient squares with one icon, so all 12 look alike apart from colour. You can't tell a project apart before you open it.
- The background is three soft blobs. Nothing reacts beyond a slow parallax.
- The detail modal is the part people actually read, and it's a plain text page with bullet points. All the motion happens *before* the content, none *in* it.
- The rest of the dashboard doesn't react to anything: no idle animation, no focus "breathing", no response to hover or clicks.

**Existing issues to fix along the way**
- ~~`SITE.resume` (`/cv-file.pdf`) is shipped but never linked~~ ✂️ CV removed from the site entirely (Sep 27, 2026).
- `prefers-reduced-motion` is effectively unhandled (the `.motion-safe-only` class is never used). This matters much more once 3D is added.
- `SITE.phone` is unused. That's probably fine; say if you want it shown.

---

## 1. Library stack

| Lib | Why | Cost (gzip) |
|---|---|---|
| `three` + `@react-three/fiber` + `@react-three/drei` | 3D scene, declarative in React; drei gives text, environment maps, `Float`, `MeshTransmissionMaterial`, etc. | ~180 KB, lazy-loaded |
| `@react-three/postprocessing` | Bloom, chromatic aberration, vignette. This is where most of the "alive" glow comes from. | ~40 KB |
| `framer-motion` (keep, maybe upgrade to `motion`) | Already used everywhere; handles all 2D UI motion | already paid |
| **Optional:** `gsap` (now fully free, incl. SplitText/ScrollTrigger) | Only if we want scripted cinematic timelines (boot sequence, text splitting). Framer can do most of it. | ~25 KB |
| **Optional:** `@react-three/rapier` | Real physics (tiles tumbling, a toy box of skill blocks) | ~600 KB wasm, **heavy** |
| **Optional:** `howler` | Not needed; the existing Web Audio engine is fine. Listed only so we can cut it. | — |

**Decision needed (D1):** R3F v9 requires **React 19 → Next 15**. Options:
- (a) Upgrade to Next 15 / React 19 and use R3F v9. This is the cleaner long-term choice, and upgrading a static-export app is low risk. **Recommended.**
- (b) Stay on Next 14 and pin R3F v8 / drei v9.

**Ground rules for all 3D work**
- Every WebGL component loads via `next/dynamic({ ssr: false })` so the first paint stays fast and static export still works.
- One shared `<Canvas>` behind the UI, not one per component (browsers cap WebGL contexts at around 16).
- Fallback: if there's no WebGL, `prefers-reduced-motion` is set, or the device is low-power, render the current 2D version. That means **nothing gets deleted**, only upgraded.
- Performance budget: 60fps on a mid-range laptop; on mobile, use `dpr={[1, 1.5]}`, fewer particles, and no postprocessing.

---

## 2. Global: background and atmosphere

- **A1 · 3D living background (M).** Replace the CSS blobs with a full-screen shader: flowing noise gradient (light = teal/mint, dark = deep violet) plus slow floating particles/dust. It reacts to the cursor (a gentle ripple where the pointer moves) and to the focused tile (the background tint shifts toward that tile's theme colour).
- **A2 · Theme-switch transition (S).** Instead of a colour fade, animate a radial "day/night" wipe from the toggle button (a shader uniform or `clip-path` circle).
- **A3 · Cursor companion (S).** Custom cursor: a small glowing ring that stretches with velocity and snaps/magnetizes onto buttons and tiles. Disabled on touch.
- **A4 · Idle state (S).** After about 20s of no input, the dashboard slowly "breathes" (subtle scale plus a bloom pulse) and the focused tile bobs. After about 90s it auto-enters Sleep.

## 3. Boot sequence

- **B1 · 3D console boot (M).** Replace the 2D logo pop with a short (about 2s) cinematic: particles converge into the "GA" logo in 3D, a bloom flash, then the camera pulls back and the dashboard panel slides in. Click or key press skips it.
- **B2 · Boot sound (S).** A synthesized startup chord in the existing sound engine (plays only if unmuted, since browsers block audio before interaction anyway).
- **B3 · Session memory (S).** Full boot on the first visit; returning visitors (sessionStorage) get a 0.5s quick boot.
- **B4 · "Press A to start" gate (S, optional).** A title screen before the dashboard. It adds a click before content, so consider whether that friction is worth it. **Leaning cut.**

## 4. The carousel: main upgrade

- **C1 · Tiles become 3D cartridges/cards (L).** Render the carousel in the R3F canvas: each tile is a rounded 3D slab with thickness, a glossy/matte material, and the theme gradient. The focused tile lifts forward, tilts toward the cursor, and catches a moving specular highlight. Unfocused tiles sit back along a real 3D arc (with depth-of-field blur) instead of the current fake scale/opacity arc.
- **C2 · Per-tile 3D "diorama" icon (L).** Replace the flat SVG glyph with a small animated 3D object per tile, so each project is recognisable at a glance:
  - Cuffka → 3 nodes with message packets flowing between them (Raft leader glows)
  - Docs++ → stacked server blocks with blinking LEDs
  - Hawkes → live-ticking candlestick/line chart
  - ChurnSense → spinning bar chart / gauge
  - C-Shell → floating terminal with a blinking cursor typing `$ ls`
  - SHAM → packets bouncing between two endpoints, one dropping and retransmitting
  - Buy-Sell → a rotating shopping bag or cart
  - Research → rotating gene-regulatory graph (nodes + edges)
  - Jocata → pulsing observability waveform
  - CloudNuro → a cloud with three "tier" routes lighting up
  - About → your avatar/initials as a 3D badge
  - Games → a mini animated preview of the game itself (falling blocks / jumping cube)

  *Can be phased: build 3 or 4 first, then the rest reuse a shared "node graph / chart / blocks" primitive.*
- **C3 · Physical scrolling (M).** Drag or flick the carousel with momentum and inertia (framer `drag` + snap), plus mouse-wheel/trackpad horizontal scroll. Keeps the current keyboard and swipe input.
- **C4 · Focus feedback (S).** On focus change: a quick scale "pop", a sound blip (exists already), and a light shockwave ring on the background. Hitting the end of the list keeps the existing "bonk" shake.
- **C5 · Hover preview card (M).** Resting on a focused tile for about 0.6s slides up a mini-card beneath it with period, stack chips, and live GitHub stars, so you get a feel for a project without opening it.
- **C6 · Category dividers (S).** Turn the glass "EXPERIENCE / PROJECTS" slabs into 3D frosted-glass panels (`MeshTransmissionMaterial`) that refract the tiles passing behind them.

## 5. Launch transition

- **L1 · Keep the warp pipe, make it 3D (M).** A real 3D pipe rises and the tile cartridge flips and drops into it, with a bloom burst and a camera dolly into the pipe opening, then the detail view opens. This keeps the transition you already have and makes it more cinematic.
- **L2 · Alternative (pick one): "Cartridge insert".** The tile flips 180°, slides into a console slot, and the screen powers on with a CRT-style scanline wipe. This fits the "game deck" theme and is less Mario-specific. **Decision D2: pipe or cartridge?**
- **L3 · Shared-element continuity (S).** The tile's gradient and icon morph into the modal's hero header (framer `layoutId`), so the modal doesn't just pop in.

## 6. Detail view (where content lives)

- **M1 · 3D hero (M).** The modal header shows the tile's diorama (from C2) large and interactive: drag to rotate, with a small idle animation.
- **M2 · Staggered content reveal (S).** Title, then chips, then bullets cascade in; a text scramble/decode effect on the title (fits the console feel).
- **M3 · Animated metrics (S).** Pull out the numbers already in your bullets (105K events/sec, 0.102 µs p99, 87% ROC-AUC, 125+ tests, 5,000+ attendees…) into big count-up stat tiles at the top of each project. `useCountUp` already exists.
- **M4 · Project-specific mini visualisations (L, pick a few).** Small interactive demos:
  - Cuffka: a Raft election animation where you can "kill" the leader and watch re-election
  - SHAM: a sliding-window visualiser where you can drop a packet and watch the retransmit
  - Hawkes: an animated order-flow intensity chart
  - C-Shell: a fake interactive terminal accepting a few commands
  
  *These are high effort but by far the most memorable. Suggest 1 or 2 max, chosen by you.*
- **M5 · Tabs inside modal (S).** For long projects: Overview / Tech / Links. **Leaning cut**, since the content isn't long enough to need it.
- **M6 · Next/prev inside modal (S).** Left/right arrows or keys jump to the neighbouring project without closing, using a slide transition.

## 7. Header, footer and system UI

- ✂️ ~~**H1 · Resume button (S).**~~ Cut: no CV download anywhere.
- **H2 · Magnetic, springy icon buttons (S).** Buttons are pulled toward the cursor, with a press "squish" and a tooltip label that slides out.
- **H3 · Live avatar (S/M).** The avatar blinks and looks toward the cursor (2D eyes) or becomes a tiny 3D head/badge.
- **H4 · Footer status (S).** A real clock with seconds ticking via flip digits, battery fill animation, and a wifi icon "signal" pulse.
- **H5 · Controller hint bar (S).** A Switch-style bottom hint bar that updates by context (← → Select · A Open · B Back · ⚙ Skills), with animated button glyphs.

## 8. Settings (skills) modal

- **S1 · Skills as a 3D constellation (M).** Skills float as labelled orbs grouped by category; hovering one highlights the projects that use it (links back to the `stack` arrays already in the data).
- **S2 · Alternative: skill "toy box" (M, needs rapier).** Skill chips as physics blocks you can fling around. Fun but heavy. **Leaning cut** unless physics is used elsewhere.
- **S3 · Skill → project filter (S).** Clicking a skill closes settings and dims every carousel tile that doesn't use it. Cheap, useful, and ties the site together.

## 9. Sleep mode

- **Z1 · Upgrade the CSS cube to a real 3D cube (S)** with bloom and a reflection floor; the DVD bounce and corner-hit flash stay.
- **Z2 · Screensaver variety (S, optional).** Randomly pick from the bouncing logo, a starfield warp, or the pipes screensaver homage.

## 10. Games

- **G1 · Arcade juice (S).** Screen shake on line clears/crashes, particle bursts, a score pop-up, and a combo sound ladder. This stays 2D canvas and doesn't need 3D.
- **G2 · Leaderboard in localStorage (S).** Top-5 local scores with initials entry (a retro 3-letter picker).
- **G3 · Third game (M, optional).** A Snake or Breakout, if you want the "arcade" section to feel fuller. **Leaning cut.**

## 11. Sound

- **Snd1 · Ambient pad (S).** A very quiet generative background drone, only when unmuted, that shifts key per focused tile.
- **Snd2 · Positional sound (S).** Hover blips are panned left/right based on tile position.
- **Snd3 · More SFX (S).** Theme toggle "click-clack", modal whoosh, boot chord. The engine already supports all of this.

## 12. Easter eggs (optional fun)

- **E1 · Konami code (S)** → unlocks a "retro" theme (pixelated shader filter plus chiptune sounds).
- **E2 · Gamepad support (S).** The Gamepad API maps a real controller's D-pad/A/B to navigation. Very on-theme.
- **E3 · Achievements (M).** Toast "achievements" for opening every project, beating a game score, finding the Konami code. Uses the existing toast system.

## 13. Accessibility, performance and quality (not optional)

- **Q1** Honour `prefers-reduced-motion`: disable the shader background, camera moves and bloom, and use simple fades. Framer has `useReducedMotion` / `MotionConfig reducedMotion="user"`.
- **Q2** A WebGL-missing or low-FPS detector auto-falls back to the 2D mode, plus a "Performance mode" toggle in settings.
- **Q3** All 3D code is lazy-loaded; first contentful paint stays under 1.5s. Measure with Lighthouse before and after.
- **Q4** Keyboard/screen-reader parity: the 3D carousel keeps real DOM buttons (visually hidden) for focus and ARIA.
- **Q5** A mobile pass: touch-friendly drag, reduced particle counts, no custom cursor.

---

## Suggested phasing

| Phase | Items | Result |
|---|---|---|
| **1 · Foundation** | D1, Q1–Q3, H1, 3D canvas scaffold, A1 | Living background, fallbacks, CV link |
| **2 · The deck** | C1, C3, C4, C2 (first 3–4 dioramas) | Carousel feels physical and 3D |
| **3 · Transitions** | B1, B3, L1 *or* L2, L3 | Boot and launch become cinematic |
| **4 · Content** | M1, M2, M3, M6, S3 | Detail pages come alive |
| **5 · Polish & fun** | remaining C2 dioramas, H2–H5, Z1, G1, Snd1–3, E1–E2 | Everything feels "juicy" |
| **6 · Stretch** | M4 (1–2 demos), S1, E3 | Signature interactive moments |

## Decisions I need from you

- **D1** Upgrade to Next 15 / React 19? (recommended: yes)
- **D2** Launch transition: keep the Mario-style warp pipe, or switch to the cartridge insert?
- **D3** Which 1–2 interactive project demos (M4), if any?
- **D4** Visual direction for 3D tiles: glossy toy-like plastic (Nintendo) or frosted glass/neon (sci-fi)?
- **D5** Anything in the "leaning cut" list you actually want (B4, M5, S2, G3)?
