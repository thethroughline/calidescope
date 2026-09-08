# Calidescope — one site

**The site is `Calidescope Site.dc.html`.** Single file, single page, no other entry point.
Anything else at the project root is reference material, not a site.

## What it is

A full-screen card grid: 9 rows × 5 columns, one card per screen, no page scroll.

- **Down** moves through the story: Home, then the seven situations, then Contact.
- **Right** moves through one situation's beats: `Backward · Situation · Result · Solution · In action`.
- Every situation starts in the middle column (Situation). Leaving a row vertically always
  returns to that middle column, so you never land mid-story.
- Navigation: touch/pointer drag on either axis, wheel/trackpad, arrow keys (Home returns to
  the top), the on-screen d-pad, and the menu (tap anywhere, tap the mark, or press `M`).
- The dark "what happens now" card carries a shortcut button straight to its service card.

Rows, in order: Positioning, Collateral, Presence, Enablement, Workflow, Proof, Throughline,
Contact. Contact has four columns instead of five (no case study).

## Layout contract

Two runtime variables own all geometry; nothing else should hard-code these numbers.

| Variable | Set by | Purpose |
|---|---|---|
| `--w` / `--h` | logic class, `size()` | one card = one viewport; drives the grid transform |
| `--barh` | `:root` in helmet | top bar height; cards pad `calc(var(--barh) + 10px)` |
| `--padh` | `:root` in helmet | d-pad band height; cards pad `calc(var(--padh) + 12px)` |

Card padding is derived from the chrome bands rather than matched to them, so they cannot
cross in short viewports. Type, icon and padding scale on both `vw` and `vh` (via `min()`),
so a landscape phone gets the same story at phone size with no breakpoints. Every card is
`overflow-x:hidden; overflow-y:auto; justify-content:safe center` — content is never clipped
unrecoverably, and cards only top-align when they genuinely cannot fit.

## Icons

Eight glyphs, one per row, drawn in the house pen: fine ink line plus one stroke in the row's
accent colour. Selected from `Calidescope Icon Library.dc.html`:

| Row | Glyph | Accent |
|---|---|---|
| Positioning | `POS-H` — faint X/Y field, three black dots, yours ringed | blue `#1E40FF` |
| Collateral | `COL-1` — two sheets, front one in accent | blue |
| Presence | `PRE-9` — round-head push pin | violet `#7A3AD2` |
| Enablement | `ENA-1` — one story, three carriers | violet |
| Workflow | `WF-D` — three dots, two arrows | violet |
| Proof | `PF-2` — one number that stands up | pink `#E933A6` |
| Throughline | `TL-1` — the brand mark, from `brand/throughline-mark.svg`, unchanged | — |
| Contact | `X-A` — two speech bubbles | blue |

The Calidescope mark itself is the horizontal-spoke construction from the brand book, always
point-up, never rotated.

## Copy

Verbatim from `uploads/calidescope-situations_1.html`. Do not rewrite it. Two intentional
edits since: the "Project in action" date tags were removed, and the Enablement situation
now reads "The pitch works. Only one person can deliver it."

## Before it goes live

- The contact form posts to `https://formspree.io/f/YOUR-FORM-ID` — replace with the real
  endpoint.
- The Throughline card links out to `https://throughline.builders/basic`.

## Reference material (not the site)

| File | What it is |
|---|---|
| `Calidescope Icon Library.dc.html` | all 33 icon candidates, with the picks marked |
| `Calidescope Brand Book.dc.html` | brand book |
| `Calidescope Options.dc.html` | figure library — option 7a is the standard (see CLAUDE.md) |
| `AI Storybuilding.dc.html` | separate piece of work |
| `brand/`, `case-studies/`, `exports/`, `design_handoff_*/` | assets and handoff packages |
| `archive/` | superseded site versions (v2, v3, v4) and the old multi-page set — kept for reference, not for publishing |
