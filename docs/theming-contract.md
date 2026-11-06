# Palette contract

The app uses one layout with three editable colors: background, cards/panels,
and accent. Settings → General → Appearance provides presets and a live preview.
There is no CSS-theme selector or theme upload. The former CSS loader is no
longer part of startup; Electron no longer watches or injects `styles.css`.
Existing uploaded theme files and legacy configuration values are preserved,
but do not affect the interface.

Whatever colors a user picks, the interface stays readable: a normaliser turns
the three chosen colors into the roles the UI paints with. It is automatic and
has no setting.

## Storage and modes

`PaletteThemeService` stores a light and dark `PaletteColors` object under
`SUP_COLOR_PALETTE` in localStorage. Each object contains exactly three hex
colors (`#rrggbb`): `background`, `surface`, and `accent`. Invalid or unavailable
storage falls back to `DEFAULT_PALETTE` at runtime. Palettes are device-local,
are not synced, and do not change persisted task/project models or the sync wire.

The stored values are the user's **raw** choice. They are normalised when they
are applied, never rewritten: a later rule change re-interprets the same choice,
and normalising a normalised palette changes nothing (idempotent), so saving an
adjusted value would not drift.

Light, dark, and system mode use the existing device-local `DARK_MODE` setting.
Presets select a coordinated pair; editing a color changes the currently displayed
mode only. Reset restores both default palettes. Switching modes preserves edits.
The saved pair is applied synchronously before the startup splash is dismissed.

The default accent is the icon's deep teal (`#075b5e`) in light mode and
`#63c5c3` in dark mode. `MaterialCssVarsModule` is seeded with the light default
accent, so Material never shows another color before the palette applies.
Default, Sand, Forest and Plum come out of the normaliser byte-identical
(background, surface, accent, hover and selected).

## Normalisation

`normalizePalette(colors, mode)` (`src/app/core/theme/palette-normalize.util.ts`)
is a pure function. Color maths (OKLab/OKLCH, WCAG contrast, sRGB mixing,
gamut mapping) live in `palette-color.util.ts`; `palette.util.ts` keeps the
storage types, `contrastingInk` and `mixColors`. Three rules hold throughout:

- **The mode is the contract.** Light palettes stay light and dark palettes stay
  dark, so Angular Material's mode-based foreground tokens (`rgba(0,0,0,.87)`
  text, `.54` icons and so on in light mode, white in dark) always have the right
  polarity, and so do native system-bar icons and chart ink. The inks of
  background, surface, hover and selected are always the mode ink (black in
  light, white in dark); only the accent and the semantic fills choose their own.
- **Hue is kept.** Only OKLCH lightness moves (chroma only where the sRGB gamut
  or an envelope cap requires it).
- **Minimal change.** A rule moves a color only when it fails, and only as far
  as needed (bisection on lightness). Colors inside the rules are returned
  unchanged.

Separation steps are WCAG contrast ratios. Text targets carry a rounding margin
(4.6 for 4.5:1), graphics too (3.1 for 3:1).

| Step                                                                             | Light                                                                                                                                                                  | Dark                                               |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Background envelope (OKLCH)                                                      | L 0.90–1.00, C ≤ 0.05                                                                                                                                                  | L 0–0.32, C ≤ 0.05                                 |
| Surface envelope                                                                 | L 0.90–1.00, C ≤ 0.05                                                                                                                                                  | L 0.20–0.34, C ≤ 0.05                              |
| Background ↔ surface                                                             | ≥ 1.06:1; the surface may sit on either side; equal colors lift the surface; with no room left the background gives way                                                | ≥ 1.15:1                                           |
| Raised surface (menus, dialogs, snackbars)                                       | = surface (shadows separate)                                                                                                                                           | surface lifted to 1.10:1                           |
| Accent                                                                           | ≥ 3:1 on background, surface, raised, hover and selected; near-greys (chroma ≤ 0.02) need 6:1, ramping to 3:1 at chroma 0.08, so a grey accent never reads as disabled | same                                               |
| Accent as text                                                                   | accent moved toward the ink until 4.5:1 on all five layers                                                                                                             | same                                               |
| Hover                                                                            | 8 % of the accent (chroma capped at 0.12) over the surface, weaker if above 1.20:1, then at least 1.08:1 from the surface                                              | ≥ 1.10:1                                           |
| Selected                                                                         | 18 % of the accent, capped at 1.60:1, then ≥ 1.22:1 from the surface and ≥ 1.08:1 from hover                                                                           | ≥ 1.30:1 / ≥ 1.10:1                                |
| Muted text                                                                       | a neutral moved toward the ink until 4.5:1 on background, surface, raised and hover                                                                                    | same                                               |
| Muted text in selected rows                                                      | 4.5:1 on selected                                                                                                                                                      | same                                               |
| Separator / border / outline (mode-ink alphas, solved on background and surface) | 1.22 / 1.32 / 3:1 (≈ 9 % / 12 % / 43 % black)                                                                                                                          | 1.30 / 1.42 / 3:1 (≈ 10 % / 12.5 % / 34.5 % white) |
| Disabled fill / label                                                            | 1.12:1 on the surface / 2.6:1 on the fill                                                                                                                              | 1.18:1 / 2.6:1                                     |
| Scrollbar thumb                                                                  | 1.7:1 on the background (neutral, not the accent)                                                                                                                      | same                                               |
| Semantic tones                                                                   | see below                                                                                                                                                              | lighter tones                                      |
| Tooltip                                                                          | inverse pair: a neutral at OKLCH L 0.32 with white text                                                                                                                | L 0.90 with black text                             |

The accent and its hover/selected tints depend on each other, and the accent
target depends on its own chroma, so the normaliser iterates to the fixed point
(a handful of rounds at most).

**Semantic tones** belong to the palette system but not to the accent. Danger
(OKLCH hue 27°, window 20–34°, chroma 0.20), warning (66°, 55–78°, 0.16),
success (147°, 135–158°, 0.15) and upcoming (304°, 292–316°, 0.20) start at
lightness 0.62 (light) / 0.70 (dark) and move toward the ink until they reach
4.5:1 as text on background, surface, raised, hover and selected. An accent
45–100° away pulls a tone up to 8° toward it (20 % of the gap); an accent closer
than 45° pushes it 8° away; an opposite accent changes nothing. Each tone has a
fill ink (black or white, ≥ 4.58:1). Default light palette: danger `#c0161b`,
warning `#8d5300`, success `#00703e`, upcoming `#823cc3`; default dark:
`#ff877b`, `#f0951b`, `#43c07a`, `#c494ff`.

Examples of hostile choices: a neon `#00ff00` accent in light mode becomes
`#009800` (black label); an accent equal to the background becomes charcoal
`#515151` (light) / `#c7c7c7` (dark); a black background picked in light mode
becomes `#dedede`, the darkest allowed light background; a `#ff0000` light
background becomes `#fed2cb`.

`src/app/core/theme/palette-normalize.util.spec.ts` checks 18 stress palettes in
both modes and a seeded random fuzz against every pair above (text, graphics,
quiet ranges, glass, hierarchy), plus idempotence, hue preservation and the
byte-identical presets.

## Roles

`PaletteThemeService.apply()` writes every role on the root element (`html`),
where Angular Material declares its light-mode tokens; `body` inherits them.
It runs only on palette or mode changes (one normalisation per mode, memoised,
and about 200 `setProperty` calls); nothing observes individual task rows.
`src/styles/components/_palette-theme.scss` maps the roles onto painted
containers and the legacy aliases.

| Token                                                                                                    | Guarantee                                                       | Legacy aliases and Material tokens fed                                                                                                                               |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--palette-background`, `--palette-surface`, `--palette-accent`                                          | normalised choices                                              | `--surface-*`, `--bg*`, `--card-bg`, `--dark*`, `--brand`, `--c-primary`, `--c-accent`, every `--palette-{primary,accent}-*` stop                                    |
| `--palette-{background,surface,accent,hover,selected}-ink`, `--palette-{background,surface}-ink-channel` | black or white, ≥ 4.58:1                                        | `--ink`, `--text-color*`, `--c-contrast`, `--palette-{primary,accent}-contrast-*`                                                                                    |
| `--palette-hover`, `--palette-selected`                                                                  | quiet, guaranteed steps                                         | hover rows; the selected role: the active nav row, the task open in the panel, multi-selected tasks, a chosen segment, selected options                              |
| `--palette-surface-raised`                                                                               | dialogs, menus, select/autocomplete panels, snackbars           | `--mat-{dialog,menu}-container-color`, `--mat-{select-panel,autocomplete}-background-color`, `--mat-snack-bar-container-color`                                       |
| `--palette-ink-muted`                                                                                    | 4.5:1 on background, surface, raised, hover; ≥ 2:1 from the ink | `--ink-muted`, `--text-color-muted`, `--sidenav-text-secondary`, placeholders, select arrow, unselected checkbox/radio/toggle handle, card subtitle, scrollbar hover |
| `--palette-selected-ink-muted`                                                                           | 4.5:1 on selected                                               | the muted tier inside the active nav row, selected and multi-selected task rows, a chosen segment                                                                    |
| `--palette-accent-text`                                                                                  | 4.5:1 on every layer                                            | `--mat-option-selected-state-label-text-color`                                                                                                                       |
| `--palette-focus-ring`                                                                                   | = accent text (≥ 4.5:1)                                         | `--focus-ring`, `--focus-ring-color`: one ring everywhere                                                                                                            |
| `--palette-separator`                                                                                    | 1.22:1 (light) / 1.30:1 (dark) on background and surface        | `--separator`, `--grid-color`, `--glass-edge-line`                                                                                                                   |
| `--palette-border`                                                                                       | 1.32:1 / 1.42:1                                                 | `--divider`, `--extra-border-color`, unselected slide-toggle track                                                                                                   |
| `--palette-outline`                                                                                      | 3:1 on background and surface (WCAG 1.4.11)                     | `--input-border-color`, `--mat-form-field-outlined-outline-color`                                                                                                    |
| `--palette-disabled`, `--palette-disabled-ink`                                                           | visible, clearly inactive                                       | disabled filled and raised buttons                                                                                                                                   |
| `--palette-scrollbar`                                                                                    | 1.7:1 on the background                                         | `--scrollbar-thumb`                                                                                                                                                  |
| `--palette-danger`, `--palette-danger-ink`                                                               | 4.5:1 as text on every layer; ink 4.5:1 on the fill             | `--c-warn`, `--c-warn-contrast`, `--color-danger`, `--input-border-color-invalid`, `--mat-form-field-error-text-color`, `--palette-warn-*`                           |
| `--palette-warning`, `--palette-success`, `--palette-upcoming` (+ `-ink`)                                | 4.5:1 as text on every layer                                    | `--color-warning`, `--color-success`, `--success-green`, `--scheduled-date-{tomorrow,today,upcoming}`                                                                |
| `--palette-tooltip-bg`, `--palette-tooltip-ink`                                                          | inverse pair, ≥ 4.5:1, ≥ 3:1 from the raised surface            | `--mat-tooltip-container-color`, `--mat-tooltip-supporting-text-color`                                                                                               |

The warn palette is written from danger: stops 50–400 are danger tints over the
surface (10–75 %) for fills behind warn text, every other stop is danger itself,
so `color="warn"` controls stay red and readable and never follow the accent.
Plugins receive `--c-warn` and `--color-*` by name, now normalised. The semantic
aliases (`--c-warn`, `--c-warn-contrast`, `--color-*`, `--success-green`,
`--scheduled-date-*`) are declared once, on `:root` in `_css-variables.scss`,
next to the first-paint value of every role (the default light palette's), which
`PaletteThemeService` replaces synchronously at startup.

The `ink()` mixin in `_palette-theme.scss` sets a container's ink and its muted
tier: canvas, cards, panels, overlays and hover rows use `--palette-ink-muted`,
selected rows (the active nav row, the task open in the panel, a chosen segment)
use `--palette-selected-ink-muted`, accent fills (filled buttons) use the accent
ink for both. A tracked task is marked by an accent edge, not a tint, and keeps
its card's ink. Text elements
otherwise keep their component colors; only `a`, `button`, `input`, `textarea`
and `select` inherit their container's ink, at zero specificity. Project/tag
identity colors remain available for their icons and dots, rather than
recoloring the entire application. Per-project backgrounds and contrast/hue
controls are no longer shown or applied; the app-wide background image appears
only behind Glass, always blurred. New components should use the shared
surface styles and roles, rather than hardcoded colors.

Native system bars, the Electron title bar and charts read the normalised roles:
system-bar icons and the title bar follow the mode, chart axes use the mode
ink, grid lines the separator alpha, and chart tooltips the raised surface and
its ink.

## Glass roles

Glass panels (`src/styles/components/_glass.scss`) consume these roles; the
normaliser computes them per palette and mode.

| Token                                                                  | Value                                                                            |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `--glass-panel-tint`, `--glass-canvas-tint`                            | the background role                                                              |
| `--glass-panel-alpha`, `--glass-canvas-alpha`, `--glass-overlay-alpha` | max(design value 75 % / 84 % / 95 %, contrast floor), as a percentage            |
| `--glass-ink-muted`                                                    | muted text, 4.5:1 on the panel tint over the worst backdrop                      |
| `--glass-focus-ring`                                                   | the focus ring, moved further toward the ink only if it falls below 3:1 on glass |
| `--glass-edge-line`                                                    | the separator: 1.15–1.75:1 over the palette-gradient backdrop                    |

The floor is the smallest alpha at which body ink stays ≥ 4.5:1 over the worst
backdrop **and** a muted tier still fits (worst composite luminance ≥ 0.42 in
light, ≤ 0.061 in dark). The worst backdrop is the ink colour pulled 35 % toward
the background (a dark-grey wallpaper under a light theme, the mirror in dark;
`GLASS_WORST_BACKDROP_LIFT`), not pure black behind black ink, which no OS
material, blurred image or palette gradient reaches. The design values hold for
every shipped palette (floors 0.54–0.74); very light dark-mode backgrounds raise
the panel alpha toward 90 %.

## Palette editor

The color inputs keep the raw value, so dragging a picker never fights the
user. When normalisation changes a chosen color noticeably (deltaE-OK > 0.02),
the editor shows a second swatch with the color in use ("Shown as #…") and one
line under the inputs: "Adjusted so text and controls stay readable.", extended
with "Light mode keeps light backgrounds." (or the dark equivalent) when a
background or card color belongs to the other mode. The live preview and the
preset swatches show normalised colors.
