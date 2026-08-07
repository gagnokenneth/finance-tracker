# Sign-In Page Polish — Design

Date: 2026-08-07

## Goal

Make the sign-in page look deliberate. Visual only — no behaviour changes.

## Scope

**In:** `src/pages/SignIn.tsx` presentation, and the `<title>` in `index.html`.

**Out, by explicit decision:**

- The misleading mock-mode button label ("Sign in with Google" when no Google is
  involved), a demo-mode notice, a loading state, and an error state for when the
  Google script fails to load. These were raised and deliberately deferred; the
  page keeps its current behaviour.
- Any image. `src/assets/hero.png` stays unused — it is a generic purple graphic
  with nothing to do with finance. The page relies on type and spacing.
- Dark mode. The app has none; this page will not introduce one.
- Auth logic. The mock/live branch, `renderButton`, and the effect are unchanged.

## Problems being fixed

| Current | Problem |
|---|---|
| `text-xl` title | Same size as an ordinary page heading — the page has no focal point |
| Card has no max-width | Shrink-wraps to the button, so width jumps between mock and live mode |
| Flat `bg-slate-50` | Card has nothing to sit on |
| `shadow-sm` | Too hard and tight to read as elevation |
| `px-4 py-2` inline button | Small tap target on a phone |
| No wrapper padding | Card can touch the viewport edge on narrow screens |
| Tab reads `finance` | Lowercase, visible on this page, undercuts the polish |

## Design

**Layout.** Full-height centred flex, `px-4` on the wrapper. Background becomes a
vertical gradient, `bg-gradient-to-b from-white to-slate-100`. The card becomes
`w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8` with
`shadow-lg shadow-slate-900/5`.

**Typography.** Title `text-2xl font-semibold tracking-tight text-slate-900`.
Supporting line `mt-2 text-sm text-slate-500`. A `mt-8` gap separates the
identity block from the action.

Copy:

> **Finance Tracker**
> Keep track of what you owe, and what's left to pay.

The supporting line deliberately avoids naming bills and savings — those modules
are no longer reachable, so mentioning them would be inaccurate. This wording
also stays correct if they are re-enabled later.

**Button.** Full width, `py-2.5`, `rounded-lg`, `bg-slate-900 hover:bg-slate-700`,
`text-sm font-medium text-white`, plus a visible `focus-visible` ring for keyboard
users. Live mode keeps the Google-rendered button in its centred container.

**Alignment.** Text stays centred, matching the existing page.

## Verification

No automated tests, per project convention:

- `npx tsc -b`, `npm run lint`, `npm run build` all clean.
- Manual: load the page in mock mode; confirm the card is `max-w-sm`, the button
  is full width, the tab reads "Finance Tracker", and tabbing to the button shows
  a focus ring. Narrow to phone width and confirm the card keeps its edge margin.
