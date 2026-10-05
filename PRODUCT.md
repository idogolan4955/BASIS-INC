# Product

BASIS INC. is a premium international bridal-fabric brand and the operating platform behind it. The full record is `docs/PRODUCT_BLUEPRINT.md`; this file is the short form the design tooling reads. Facts come from the owner's brief unless marked *inferred*.

## Platform

web

## Stack

pnpm monorepo. React 19, Vite, Tailwind CSS 4. PostgreSQL through Firebase Data Connect, Cloud Functions v2, Firebase Auth, Storage and Hosting. See `docs/SYSTEM_ARCHITECTURE.md`.

## Users

- **Managers** of BASIS: owner, operations, purchasing, QC, logistics, sales, marketing, finance. They work at a desk through the day and need to see what is late, what is arriving and what needs a decision.
- **Inspectors** at a factory in China, on a phone, often with poor connectivity.
- **Trade customers**: bridal designers, bridal salons, ateliers, dress manufacturers, fashion manufacturers, distributors, wholesalers. They read the public site to specify fabric and request samples.

## Product Purpose

Supply the foundational fabrics a bridal gown is built on, and run the company that sources, controls, ships and sells them: products, suppliers, manufacturing, QC, inventory, logistics from China, customers, marketing and the public brand site.

## Positioning

Soft Industrial Luxury. The base layer of bridal fashion, sold with the precision of a technical house: exact shades, exact specifications, traceable lots.

## Operating Context

- `apps/platform` is an Operate surface: dense, fast, authenticated.
- `apps/web` is a Persuade surface: the brand flagship, editorial and cinematic.
- Launch fabric families: Powermesh, Shanel Lining, Bridal Tulle.

## Capabilities and Constraints

- Status is derived from recorded facts, never typed in.
- Cost and supplier identity are hidden from roles without cost access, in the data and not only on screen.
- No business data in components. Sample records exist only in sample mode and are labelled.
- No public checkout in the first versions.

## Brand Commitments

- Palette: bone, milk, nude, sand, cocoa, charcoal, restrained black.
- BASIS is set in a strong architectural sans. Product names may use a bold handwritten accent.
- The platform follows the owner's reference of 2026-10-06: espresso sidebar, warm paper surfaces, display serif for titles and figures, fabric in the title band. See `docs/DESIGN_SYSTEM.md` §0.
- Never: generic SaaS dashboard, blue interface accents, random gradients, glass panels, pills, template sections.

## Evidence on Hand

- The owner's written brief and reference image for the platform.
- No logo artwork, licensed typefaces or fabric photography yet. Stand-in faces and construction drawings are used and marked as such.

## Product Principles

One source of truth. Facts over statuses. Traceability to the roll. Cost is landed cost. Shade is a system. One brand, two registers. Built to be real.

## Accessibility & Inclusion

WCAG 2.2 AA. Status never by colour alone. Keyboard-complete platform. Reduced motion honoured. English first; layout uses logical properties so right-to-left locales stay possible *(inferred from the owner working in Hebrew)*.
