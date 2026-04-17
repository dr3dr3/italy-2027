# Design system — italy-2027

Minimal by design. One file, CSS variables, Tailwind on top. Iterate as we go.

## Palette

All colours live as CSS variables in `app/globals.css` and are referenced by Tailwind
via `tailwind.config.ts`. Never hardcode hex values in components.

| Token         | Hex       | Use                                      |
|---------------|-----------|------------------------------------------|
| `--ink`       | `#1a1a1a` | Primary text                             |
| `--cream`     | `#faf7f2` | Page background                          |
| `--terracotta`| `#c65d3a` | Primary accent — buttons, links, active  |
| `--olive`     | `#6b7a3f` | Secondary accent — confirmed, success    |
| `--dust`      | `#e8e2d5` | Borders, dividers, card backgrounds      |
| `--wine`      | `#7a2e2e` | Destructive actions only                 |

Tailwind mapping (in `tailwind.config.ts`):

```ts
colors: {
  ink: 'var(--ink)',
  cream: 'var(--cream)',
  terracotta: 'var(--terracotta)',
  olive: 'var(--olive)',
  dust: 'var(--dust)',
  wine: 'var(--wine)',
}
```

## Typography

Two fonts, both Google Fonts, loaded via `next/font`:

- **Fraunces** — headings, page titles, stop names. Used big and confident.
  Weights: 400, 600. Optical size: auto.
- **Inter** — body, UI, buttons, forms, everything else. Weights: 400, 500, 600.

Scale (Tailwind classes assume these):

| Use                  | Font     | Size       | Weight |
|----------------------|----------|------------|--------|
| Page title (h1)      | Fraunces | `text-4xl` | 600    |
| Section title (h2)   | Fraunces | `text-2xl` | 600    |
| Stop name (h3)       | Fraunces | `text-xl`  | 600    |
| Body                 | Inter    | `text-base`| 400    |
| UI / labels          | Inter    | `text-sm`  | 500    |
| Metadata / captions  | Inter    | `text-xs`  | 400    |

## Spacing

4px base unit. Use Tailwind's default scale (`p-1` = 4px, `p-2` = 8px, etc.). Prefer
these values: 4, 8, 12, 16, 24, 32, 48, 64. Don't invent in-between values.

## Radii

- Cards: `rounded-lg` (8px)
- Buttons: `rounded-md` (6px)
- Inputs: `rounded` (4px)
- Images: `rounded-lg`

## Shadows

Almost none. One soft shadow for elevated cards:

```css
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
```

Everything else is flat. No glows, no dramatic drop shadows.

## Voice & tone

See `CLAUDE.md` for the full voice rules. Short version:

- Functional chrome stays serious and trustworthy
- Empty states, toasts, 404s, loading states — that's where the humour lives
- Dry Aussie voice, not cartoonish
- Turkish easter eggs limited to 4–5 across the whole app
- Light Italian flavour on section headings
- If every button is a joke, none of them are

## Empty state copy — the seed list

Use these as-is or adapt:

- Empty comments: **"Crickets. Say something."**
- Empty suggestions: **"No one's put their hand up yet."**
- Zero votes: **"Nobody's committed. Classic."**
- Empty videos: **"No one's shared a video yet. Be the hero."**
- No itineraries yet: **"Ozzie hasn't cooked anything up yet. Sit tight."**
- 404: **"Nerede?"** / "We have no idea where you were trying to go."
- Magic link error: **"Something's gone sideways. Try again?"**
- Archived toast: **"Sent to the bottom drawer."**
- Confirmed suggestion toast (1 in 10): **"Afiyet olsun."** (otherwise: "Locked in.")
