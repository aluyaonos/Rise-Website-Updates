# Rise Global Hero

## Mission section and image handoff

`mission.css` and `mission.js` implement the mission section from Figma. At 1440px the white section uses 120px horizontal padding, a 440px left column and a 540px right column. The destination image is 440×300px with 16px corners, matching Figma node `63288:391973`. The heading uses Tomato Grotesk 36/42, body copy Work Sans Medium 16/24, and statistics Tomato Grotesk 112/120. The five 80×80 flag SVGs are stored locally.

The handoff selects a visible hero card in the middle or lower left whose center is left of the destination. It follows a single measured path to the destination's final sticky position, avoiding a second settling movement while the mission section enters. Direct entry past the hero uses the static mission image when no source card is available.

Native document scroll moves the hero images through perspective depth and fades them near the camera and at the section boundary. Upward scroll retraces the same depth and scale without carrying wheel momentum into the hero. `MISSION_IMAGE_FROM_HERO` enables the measured hero-image handoff independently of the page-depth motion. The left image/title column uses a viewport-height sticky frame anchored at bottom: 0, with content aligned to the bottom and 86px of clearance below the heading, matching United Carriers' structure. The right mission text and statistics continue scrolling. Below 700px this becomes a stacked reading layout.

The left mission title enters one measured line at a time using Wealthsimple's staggered rise-and-fade timing. The right mission paragraphs remain static. Each statistic counts from zero to its final value over one second while its caption fades and sharpens from a 4px blur.

Reference study: Waabi's `Benefits` implementation uses measured source/destination rectangles, cubic in/out translation/scale, and inverse-scale radius compensation. United Carriers' `.home-intro-stick` uses a sticky image/title block beside an independently scrolling right column. This project reconstructs those mechanisms in vanilla JavaScript and native CSS, preserving its existing Three.js renderer. No additional animation framework is installed. Keyboard, wheel and touch allow document scrolling; the original image depth movement is active at the beginning of the hero. DialKit is hidden once the mission reading begins and returns in the hero.

The handoff and text reveals are recorded under `interaction-journal/mission-image-handoff/` and `interaction-journal/mission-copy-and-stats/`. These local records are excluded from public deployment. Include `mission.js`, `mission-reveal.js`, `mission.css`, `assets/flags/`, and `assets/fonts/WorkSans-Medium.ttf` when deploying the page.

## Layout exploration

The DialKit clipboard button exports the **currently visible layout** as `rise-image-layout` schema version 1 JSON. It includes normalized container bounds relative to the hero, aspect ratios, back-to-front layers, initial world depth, source viewport dimensions and active variant settings. This captures actual random placements after scrolling, rather than relying on arrangement seeds. Image filenames and transient velocities/timers are intentionally omitted so the same geometry can be reused with future image libraries. `containerCount` is the number of visible exported containers, while `settings.imageCount` is the active pool limit. Partly cropped images retain out-of-frame coordinates. The vendor adapter has one project-specific `dialkit:copy` event hook; preserve that hook if updating DialKit.

Telescope uses the twelve user-supplied layouts in `preferred-layouts.js`. Both arrangement-68 captures are separate entries because their padding and geometry differ. Each saved layout preserves its normalized anchors, widths, aspect ratios, depth order and settings: 12 images, gap 0, its own padding (41, 47, 64, 71 or 77px), 2 slower-travelling images and 0ms recycling delay. At the source viewport (1687×1043), bounds reproduce the exports exactly; other viewport sizes scale the horizontal bounds and preserve image aspect ratios.

The saved padding values guide placement only. The oversized canvas is cropped solely by the hero boundary, so there is no additional teal inset masking images near an edge. Image corners use five proportional tiers—4, 6, 8, 10 and 12px—ranked from the smallest to largest visible container. The former image hover enlargement is removed; pointer movement continues to drive the shared camera/parallax response without changing an individual image's scale.

Image positions use a navigation-safe top boundary: their neutral projected top edge stays at least 16px below the navigation's bottom edge during refresh and depth scrolling. This is calculated from each card's current depth and scale without changing the camera, pointer target or cursor-driven parallax.

The navigation boundary uses a smooth 24px transition instead of a hard clamp and guards projection behind the camera. Incoming cards are positioned while transparent before fading into view.

The independent incoming-count experiment is disabled (`INDEPENDENT_INCOMING_LAYOUTS=false`). Telescope again shares one 12-image pool between outgoing and incoming layouts. Navigation and background changes remain active.

Rechecked against Rise's live production hero on 2026-11-08: `bg-gradient-to-b from-[#007483] to-primary`, with `--primary-color: #0898a0`. The local hero already uses those exact light-mode endpoints and direction; the gradient is deliberately subtle.

Fresh navigation starts with the original Telescope composition. Refresh selects a preferred layout. Each depth-scroll gesture draws from a shuffled collection of all twelve without repetition until exhausted, avoiding an immediate repeat between cycles. Only invisible recycled planes take the incoming template; live images retain their continuous depth motion and fade. The **Saved layout** selector and Previous/Next/Shuffle actions preview the collection directly. These records replace the former generated 90–99 pool and Telescope density-based placements. General tuners remain available; automatic scroll draws restore the selected record's settings.

**Image count** tunes each variant's pool from 4 to 60. Telescope's saved collection always restores 12. Orange retains density-aware incoming placement: 64 randomized viewport candidates favor open areas, with every third placement attempting modest overlap. Its default count is 40.

**Images remaining** slows the selected largest containers to 65% of natural travel speed. It allows them to continue shrinking while smaller images recycle, rather than freezing copies or enforcing an exact visible count. **New layout delay (ms)** delays an invisible plane's re-entry; the saved collection uses 0. Both variants share pointer camera movement, inertial bidirectional depth scrolling, perspective scaling, full fades, individual recycling, touch/keyboard support and reduced-motion behavior.

The clipboard button exports the currently visible field. Orange's session-local recorded snapshots remain separate; they do not replace the supplied Telescope geometry.

Run `python3 serve.py` for the cache-free preview at http://127.0.0.1:4174.
DialKit's native vanilla adapter is vendored under `vendor/dialkit/` from installed dialkit 2.1.0, with no React or build step. It starts collapsed and remains available across the hero and mission sections. The default preview is Telescope; use **Variant** to switch back to International Orange. Each image-layout folder has its own Gap, Padding, Arrangement (1–100), Previous, Next and Shuffle controls. **Mission → Title delay (ms)** delays the stacked entrance of “Built to make global wealth more accessible” from 0–2000ms in 10ms steps, with a 180ms default. The flag hover defaults are 8px padding, 230 spring stiffness, and 18 spring damping. Settings and DialKit saved versions persist in localStorage.

International Orange Gap increases world-space separation (0 is reference spacing; 100 doubles it), while Padding clips field edges in pixels. Its **Record scroll layouts** control saves settled fields under arrangement numbers for session-local replay. Telescope's preferred selector remains authoritative for saved compositions.

Deploy `preferred-layouts.js`, `layout-explorer.js`, `layout-explorer.css` and `vendor/dialkit/` with the existing runnable files. No journal files are public assets.

Run `python3 -m http.server 4174 --bind 127.0.0.1` here. Preview at http://127.0.0.1:4174.

Figma: https://www.figma.com/design/AtI8WA4Z5cnKnzwXhtnsFC/Rise-3.0?node-id=63198-201829
Motion reference: https://internationalorange.eu/

The temporary editorial image library is defined in `media.js`. Each recycled plane receives the next image. The shared field projects onto a responsive canvas at 103% width, with -13px/-3px offsets. Textures load before a one-second smoothstep entrance fade. Reduced motion bypasses the entrance. Orange's base field uses 40 independent particles in a 2000×2000 world-space range with 350×250 base planes.

Background verified from the live Rise light-mode hero: `linear-gradient(to bottom, #007483, #0898a0)` (`bg-gradient-to-b from-[#007483] to-primary`).

Implementation: local Three.js 0.170.0, semantic HTML, custom CSS and Tomato Grotesk fonts. Perspective, pointer smoothing, depth-dependent scale, wheel velocity decay and opacity settling share one render loop. Touch has no pointer camera. Reduced motion keeps the random composition static. WebGL failure produces a CSS image fallback using the original Figma bounds and the same proportional radius tiers.

Journal files are local evidence. Deploy only index.html, style.css, main.js, media.js, slots.js, preferred-layouts.js, layout-explorer.js, layout-explorer.css, assets/ and vendor/. Do not publish interaction-journal/.

Vendor source: https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js (MIT; license header retained).
