# Design

The binding design document is [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md). This file is the short form for design tooling; when the two differ, `docs/DESIGN_SYSTEM.md` is right.

## World

Soft Industrial Luxury: a swatch book for an import business. Warm papers ruled with hairlines, an espresso index rail, fabric drawn from its own construction. Precision and restraint instead of ornament.

## Colour

Restrained strategy. Tokens live in `packages/ui/src/theme.css` and nowhere else.

- Surfaces: `bone` page, `milk` panels, `linen` sunken, hairlines `line` / `line-strong`.
- Ink: `charcoal`, `cocoa`, `stone`.
- Accent: `nude` on dark, `nude-deep` on light.
- Rail: `rail`, `rail-raised`, `rail-line`, `rail-ink`, `rail-muted`.
- Status pigments: `moss`, `ochre`, `madder`, `slate`, `stone`.

## Type

- Sans (Archivo, variable width): the wordmark, interface text, tracked capitals for titles of panels and columns.
- Display serif (Bodoni Moda): page titles and business figures only.
- Mono (Martian Mono): codes, document numbers, dates, measurements.

All three are stand-ins behind the font tokens until the brand faces are licensed.

## Shape

Radius 2 px. No shadows on surfaces. Squares, not circles; the avatar is the one exception.

## Signatures

The index number. The swatch (status by shape, fill and colour). The selvedge (navigation state only). The label. The hand (product names, public site).

## Components

`packages/ui/src`: StatusChip, Panel, FigureTile, Sparkline, Ring, Bars, Lanes, Meter, Track, Ledger, Structure, Wordmark.

## Motion

Platform: state changes only, 150 ms. Public site: fabric behaviour (unfold, layer, stretch, shade transition), designed per breakpoint, reduced motion honoured.
