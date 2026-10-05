# BASIS INC. — Design System

Status: v0.1 · 2026-10-06 · Phase 0 foundation document
Related: [PRODUCT_BLUEPRINT](PRODUCT_BLUEPRINT.md) · [INFORMATION_ARCHITECTURE](INFORMATION_ARCHITECTURE.md) · [SYSTEM_ARCHITECTURE](SYSTEM_ARCHITECTURE.md)

This document defines the direction and the rules. Token **values** given here are v0 proposals: they will be tuned against real BASIS fabric photography and verified for contrast when the token package is built (Phase 1). The **structure** of the system is the commitment.

---

## 1. The idea: Soft Industrial Luxury

BASIS supplies what a gown is built on. The design language is the meeting of two things:

- **Soft** — skin tones, translucency, drape, the quiet of an atelier.
- **Industrial** — the mill: roll labels, spec sheets, lot numbers, measured tolerances, grids.

Luxury here is precision and restraint, not ornament. The reference objects are a swatch book, a roll label, a lab-dip card, a technical data sheet — not a fashion magazine and not a software dashboard.

### Five signatures

These recur across the public site and the platform and are what make both unmistakably BASIS.

| Signature | What it is | Where it appears |
|---|---|---|
| **The index number** | Two-digit numerals in mono — `01`, `02` — as on a swatch book | Product names, module numbers, section numbering, steps |
| **The swatch** | A flat rectangular chip of colour or material | Shades, status indicators, filters, legends |
| **The selvedge** | A thin strip along one edge carrying identity, like the woven edge of a fabric | Active navigation, row state, section markers, page edges |
| **The label** | A bordered block of key facts set in mono and caps, like a roll label | Record headers in the platform; specification blocks on the site |
| **The hand** | A bold marker-written word | Product names on the site; nowhere in operational UI except the product's own name |

## 2. One system, two registers

One set of tokens. Two **registers** select different scales from it.

| | Editorial (public site) | Operational (platform) |
|---|---|---|
| Purpose | Emotion, desire, brand | Speed, accuracy, density |
| Type | Very large, fluid display sizes | Small, fixed sizes, tabular figures |
| Space | Generous; negative space is a material | Tight; 4 px rhythm |
| Colour | Material tones lead; imagery carries the page | Milk and bone surfaces; colour reserved for meaning |
| Motion | Choreographed, fabric-like | Functional, ≤ 150 ms |
| Imagery | Macro material photography, film | None decorative; evidence photos only |
| The hand | Yes | Product name only |

Both share palette, typefaces, borders, radii, the five signatures and iconography. A register is applied with `data-register="editorial|operational"` at the application root; components read tokens, not hardcoded values.

## 3. Colour

### 3.1 Material palette (primitives)

| Token | v0 value | Character |
|---|---|---|
| `milk` | `#FBF8F3` | Lightest surface. Paper, lining |
| `bone` | `#F1ECE3` | Secondary surface |
| `sand` | `#DDD0BE` | Tertiary surface, strong dividers |
| `nude` | `#C9AD93` | Brand skin tone. Accent, imagery harmony |
| `cocoa` | `#6B4F3F` | Warm dark. Secondary text, accents |
| `charcoal` | `#2B2927` | Primary text, dark surfaces |
| `black` | `#0E0D0C` | Restrained. Display type, deepest surface |

Each primitive gets a short tonal ramp generated in OKLCH for hover / pressed / tint needs. There is no blue, no purple and no pure white or pure grey in the system — all neutrals are warm.

### 3.2 Semantic tokens

| Role | Light theme | Dark theme (charcoal) |
|---|---|---|
| `surface.base` | milk | charcoal |
| `surface.raised` | bone | charcoal + 1 step |
| `surface.sunken` | sand (tint) | black |
| `surface.inverse` | charcoal | milk |
| `text.primary` | charcoal | milk |
| `text.secondary` | cocoa | sand |
| `text.muted` | stone (below) | stone |
| `text.inverse` | milk | charcoal |
| `border.hairline` | charcoal @ 12% | milk @ 14% |
| `border.strong` | charcoal | milk |
| `accent` | nude | nude |
| `focus` | charcoal | milk |

The site alternates milk, bone and charcoal sections. The platform is light (milk) by default; the charcoal theme is supported by the same semantic tokens and can be enabled later.

### 3.3 Status colours

Status colours are earth pigments, not traffic lights. They sit beside the material palette without breaking it.

| Token | v0 value | Meaning |
|---|---|---|
| `status.positive` — *moss* | `#56633F` | Pass, released, on track, delivered, paid |
| `status.caution` — *ochre* | `#9A6B1F` | Conditional pass, at risk, expiring, awaiting |
| `status.critical` — *madder* | `#8F3A2B` | Fail, delayed, blocked, rejected, overdue |
| `status.transit` — *slate* | `#4B5661` | In progress, in transit, in production |
| `status.neutral` — *stone* | `#857D74` | Draft, planned, archived, not started |

Rules:
- Status is **never colour alone**: always a text label, plus a swatch chip whose *fill pattern* also differs (solid, half, outline, hatched) so it reads without colour.
- Each status has a foreground value (text-safe on milk and bone) and a tint (≈ 10% mix over the surface) for row backgrounds.
- Mapping from domain states to status tokens lives in one place in `@basis/ui`, keyed by the enums in `@basis/shared`. Components never choose a colour for a state themselves.
- Lifecycle state and health are shown as two separate indicators, matching the domain model.

### 3.4 Shade colours

Colours of BASIS shades are **data**, not design tokens. They come from the Shade System (reference values converted for screen) and are always shown inside a swatch with the shade's name and code, with the standing note that screen colour is indicative.

### 3.5 Contrast

- Text pairs meet WCAG 2.2 AA (4.5:1 body, 3:1 large text and essential graphics). `charcoal`, `black` and `cocoa` are the text colours on light surfaces; `nude` and `sand` are **not** text colours.
- Contrast for every semantic pair is asserted by an automated test in the token package; a failing pair fails the build.

## 4. Typography

### 4.1 Roles

| Role | Typeface direction | Use |
|---|---|---|
| **Architectural sans** | A neo-grotesque with a strong, wide uppercase and a full weight range, ideally variable with a width axis | The BASIS wordmark, display headlines, all UI text |
| **Mono** | A plain, slightly technical monospace with tabular figures | Index numbers, SKU and document codes, measurements, dates, table figures, labels |
| **The hand** | Bold marker lettering | Product names only: *powermesh*, *shanel lining*, *bridal tulle* |

Typeface selection is an open decision (licensed foundry face vs. open-source). Until decided, tokens reference roles (`font.sans`, `font.mono`, `font.hand`) and the build uses an open-source stand-in for each. All fonts are **self-hosted** — no third-party font CDN.

**The hand, done properly.** A handwriting font repeats identical letterforms and looks typed. Product names are few, so each is drawn once as **vector lettering** (SVG) and treated as artwork: it can be stroked on with motion, scaled without loss and themed by colour. A marker font is kept only as a fallback for a name that has no artwork yet.

The reference lockup from the brief becomes a system:

```
BASIS                 ← architectural sans, caps, tracked
powermesh             ← the hand (SVG lettering)
02                    ← mono index number
CORE / WARM NUDE      ← mono caps: shade collection / shade
```

### 4.2 Scale

**Operational** (fixed, px): `11 · 12 · 13 · 14 · 16 · 20 · 24 · 32`. Base 13. Line height 1.4 for text, 1.2 for headings. Tables at 13 with tabular figures.

**Editorial** (fluid, `clamp()` between a 390 px and a 1920 px viewport):

| Token | Range | Use |
|---|---|---|
| `display.xl` | 64 → 280 px | One word per screen: BASIS, a family name |
| `display.l` | 48 → 160 px | Section statements |
| `display.m` | 36 → 96 px | Page headlines |
| `heading` | 24 → 40 px | Sub-headlines |
| `body.l` | 18 → 22 px | Lead paragraphs |
| `body` | 16 → 18 px | Reading text |
| `label` | 11 → 13 px | Mono caps labels |

Rules: display type is set tight (line height 0.85–0.95, negative tracking); labels are mono caps with positive tracking; body measure 55–70 characters; never more than three sizes in one viewport on the site.

## 5. Space, grid and layout

**Spacing scale** (px, 4-based): `0 · 2 · 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 192 · 256`.
Operational uses 4–32. Editorial uses 16–256, with section spacing fluid.

**Grid.**

| | Columns | Gutter | Margin |
|---|---|---|---|
| Site, mobile (designed at 390) | 4 | 16 | 16 |
| Site, tablet (768) | 8 | 20 | 32 |
| Site, desktop (1280+) | 12 | 24 | 48–96 fluid |
| Platform | Index rail 216 (collapsed 56) · content fluid · optional chain panel 320 | 16 | 24 |

**Breakpoints**: `390 · 768 · 1024 · 1280 · 1536 · 1920`. Platform components respond to their **container**, not the viewport, so the same table works in a full page and in a side panel.

**Composition (editorial).** Asymmetric; type and image overlap and layer; large areas left empty on purpose; alignment to the grid is strict even when the composition looks free.

## 6. Borders, radii, surfaces, elevation

The system is drawn with **lines, not boxes with shadows**.

| Topic | Rule |
|---|---|
| Hairline | 1 px, `border.hairline`. The primary structuring device: rows, columns, sections |
| Strong rule | 1 px, `border.strong`. Table headers, label frames, section starts |
| Selvedge | 3 px strip on the leading edge. State and identity |
| Radius | `0` by default. `2 px` on inputs and chips. Nothing rounder; no pills, no circles except avatars |
| Shadows | None on surfaces. One soft shadow token exists for floating layers only (menus, dialogs, palette) |
| Surfaces | Separated by tone (milk → bone → sand) and hairlines, not by elevation |
| Texture | On the site, material photography and a very fine paper grain may be used on large surfaces. No gradients as decoration; a gradient appears only as a shade transition with meaning |
| Translucency | Used only where it represents the material (tulle, mesh layering). No frosted-glass panels |

A "card" in BASIS is a ruled region on the grid — a label — not a rounded floating box.

## 7. Operational component language

### 7.1 Tables (ledgers)

The most important component in the platform.

- Row height 32 px (compact 28, comfortable 40). Hairline between rows; no zebra striping.
- Header: mono caps 11 px, strong rule beneath, sticky. Sort shown by a small mark, not a coloured header.
- Identity column (number / code) in mono, sticky, links to the sheet.
- Numbers right-aligned, tabular figures, unit in muted text (`1,240.5 m`). Money shows currency code.
- Dates in one unambiguous format (`06 Oct 2026`); relative time only as a secondary hint.
- Status as swatch chip + label. A row with a critical health state carries a madder selvedge.
- Hover is a bone tint; selection a sand tint with a charcoal selvedge.
- Empty state: one sentence and the primary action. No illustration.
- Totals row for numeric columns. Keyboard: arrows move, `Enter` opens, `Space` selects, `/` focuses filter.

### 7.2 Forms

- Labels above fields, 12 px, sentence case. Help text beneath, muted.
- Inputs: 32 px high, milk fill, hairline border, 2 px radius; focus = strong border + focus ring. No floating labels.
- Units and currencies are part of the field (`[ 150 ] cm`), not free text.
- Long forms are sectioned with ruled headings and index numbers; a summary rail shows completion.
- Validation on blur and on submit; errors in madder with text, attached to the field, summarised at the top.
- Destructive or irreversible actions (issue, sign off, finalise) require an explicit confirmation step that restates the consequence.

### 7.3 Navigation

- Index rail: numbered modules, sans labels, mono numbers; active item marked with a selvedge, not a filled pill.
- Tabs: text with an underline rule; saved views use the same pattern.
- Breadcrumbs in the masthead, mono for codes.
- Command palette: the fastest path everywhere; results grouped by type with codes in mono.

### 7.4 The label header

Every record sheet opens with a label: a ruled block with the record number in large mono, its name, the two status indicators and four to six key facts in a caps-label / value grid — the on-screen equivalent of a roll label. It is the same component for a SKU, a purchase order, a shipment and a customer, with different facts.

### 7.5 Timelines

Milestones and legs share one timeline component: a horizontal or vertical track with planned, forecast and actual marks per step; slippage is drawn as the gap between planned and forecast, in ochre or madder. The same component renders a production run and a shipment route.

### 7.6 Buttons and actions

- Primary: charcoal fill, milk text, square. One per view.
- Secondary: strong outline. Tertiary: text with underline on hover.
- Destructive: madder outline; fill only in the confirmation step.
- 32 px high in the platform; larger and more spacious on the site, where the primary action (*Request samples*) is a signature element.

## 8. Iconography

- Text first. An icon never replaces a label in navigation or in a primary action.
- One small set, drawn on a 16 px grid with a 1.5 px stroke, square caps and joins, no fills, no two-tone.
- A base open-source set is restricted to an approved list and supplemented by custom BASIS icons for domain objects (roll, lot, swatch, container, leg, inspection).
- No decorative icons on the public site. No emoji anywhere.
- Status is shown by swatch chips, not icons.

## 9. Motion

### 9.1 Principles

Motion is taken from how fabric behaves. Each principle has a defined technique so it is implemented consistently.

| Principle | Meaning | Technique |
|---|---|---|
| **Unfold** | Content is revealed as cloth is unrolled or unfolded | Clip-path / mask reveals along one axis; staggered lines |
| **Layer** | Sheer layers overlap and shift | Parallax between translucent planes; blend modes on tulle imagery |
| **Stretch** | Powermesh extends and recovers | Horizontal scale with an elastic return; variable-font width axis on display type |
| **Transparency** | Opacity as a material property | Opacity and blur ramps tied to scroll position |
| **Soft reveal** | Nothing snaps | Long ease-out curves, small distances |
| **Shade transition** | Moving through the Shade System | Background and type colour interpolated in OKLCH between shades |
| **Material movement** | The fabric itself moves | Film loops; one real-time cloth moment where it earns its place |

### 9.2 Tokens

| Token | Value | Use |
|---|---|---|
| `duration.instant` | 80 ms | Platform hover, press |
| `duration.fast` | 150 ms | Platform transitions, menus |
| `duration.base` | 300 ms | Site interface transitions |
| `duration.slow` | 700 ms | Site reveals |
| `duration.cinematic` | 1200 ms+ | Site hero choreography |
| `ease.soft` | `cubic-bezier(0.22, 1, 0.36, 1)` | Reveals, unfolds |
| `ease.drape` | `cubic-bezier(0.65, 0, 0.35, 1)` | Large moves, shade transitions |
| `ease.stretch` | Spring, low damping | Stretch and recovery only |

### 9.3 Rules

- **Platform**: motion only explains a change of state. Nothing over 150 ms; no scroll effects; no entrance animations on data.
- **Site**: choreography is designed per section and per breakpoint — mobile sequences are their own designs, shorter and vertical.
- Animate only `transform`, `opacity`, `clip-path` and colour. Never layout.
- `prefers-reduced-motion` replaces choreography with simple fades and removes scroll-linked movement. Content is never hidden behind an animation that might not run.
- **WebGL / 3D** is used only where it materially improves understanding of the material — candidates: one cloth-behaviour hero moment; the Shade System explorer. Each is a lazy-loaded island with a static image fallback, capability and power gating, and its own performance budget. Everything else is CSS and video.
- Scroll is native. No scroll-jacking; smoothing, if used, must not break native behaviour or accessibility.

## 10. Imagery

- Macro material photography is the primary imagery: weave, mesh structure, edge, fold, layering on skin tones.
- Lit softly, colour-accurate, on palette-toned grounds. No stock imagery; no generic bridal lifestyle scenes.
- Delivered as modern formats with responsive renditions and defined focal points; art-directed crops per breakpoint.
- Technical imagery (in QC and on spec sheets) is evidence, shown with scale and without styling.

## 11. Responsive rules

1. The site is designed at 390 and at 1440 as two designs sharing content and tokens; intermediate sizes interpolate.
2. The platform is desktop-first for ledgers and sheets, **mobile-first for field tasks** (inspection, receiving, photo capture, approvals, Gateway attention list).
3. Touch targets ≥ 44 px on touch devices; platform density tokens switch on pointer type.
4. No horizontal page scroll. Wide tables scroll inside their container with a sticky identity column.
5. Use logical CSS properties throughout so right-to-left locales are possible without rework.

## 12. Accessibility

- WCAG 2.2 AA across both applications.
- Visible focus: 2 px ring in `focus` colour with 2 px offset, on every interactive element.
- Full keyboard operation of the platform; documented shortcuts.
- Semantic structure, labelled controls, accessible names on swatches (shade name and code, status label).
- Colour never the only carrier of meaning (see §3.3).
- Reduced motion respected (see §9.3).

## 13. What BASIS never looks like

| Avoid | Instead |
|---|---|
| Rounded cards with drop shadows everywhere | Ruled regions on a grid |
| Gradients, glows, glass panels | Flat material tones; translucency only as material |
| Blue or purple interface accents | Charcoal for action; earth pigments for status |
| Icon-led navigation, decorative icons | Numbered text index |
| Pills and circular buttons | Square geometry, 0–2 px radius |
| KPI tiles with sparkline confetti | A small set of figures in a ruled row; detail lives in ledgers |
| Inconsistent spacing | The 4-based scale only |
| Template hero + three feature columns + testimonial slider | Editorial sequences composed for the specific content |
| Handwriting used as a general font | The hand reserved for product names |

## 14. Implementation

```
packages/ui/
├─ tokens/        primitives.css · semantic.css · registers.css · motion.css   (CSS variables; the source of truth)
├─ tailwind/      preset mapping tokens to Tailwind 4 theme
├─ primitives/    accessible headless-based building blocks (button, input, dialog, menu, tabs…)
├─ operational/   ledger table, label header, timeline, status chip, filter bar, command palette, form sections
├─ editorial/     display type, hand lettering, swatch, reveal, layered media, spec block
├─ status/        the single mapping from domain enums to status tokens
└─ icons/         approved set + custom domain icons
```

- Tokens are plain CSS custom properties, consumed by both apps and by Tailwind.
- Components are documented in a living catalogue with every state, in both registers and both themes.
- Design tokens are the contract with any design tool: values are exported from code, not maintained twice.
