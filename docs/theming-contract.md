# Palette contract

The app uses one layout with three editable colors: background, cards/panels,
and accent. Settings → General → Appearance provides presets and a live preview.
There is no CSS-theme selector or theme upload. The former CSS loader is no
longer part of startup; Electron no longer watches or injects `styles.css`.
Existing uploaded theme files and legacy configuration values are preserved,
but do not affect the interface.

## Storage and modes

`PaletteThemeService` stores a light and dark `PaletteColors` object under
`SUP_COLOR_PALETTE` in localStorage. Each object contains exactly three hex
colors (`#rrggbb`): `background`, `surface`, and `accent`. Invalid or unavailable
storage falls back to `DEFAULT_PALETTE` at runtime. Palettes are device-local,
are not synced, and do not change persisted task/project models or the sync wire.

Light, dark, and system mode use the existing device-local `DARK_MODE` setting.
Presets select a coordinated pair; editing a color changes the currently displayed
mode only. Reset restores both default palettes. Switching modes preserves edits.
The saved pair is applied synchronously before the startup splash is dismissed.

The default accent is the icon's deep teal (`#075b5e`) in light mode and
`#63c5c3` in dark mode. `--st-brand` aliases `--palette-accent`, so workspace
highlights follow both the default and custom accent. Existing saved palettes
remain unchanged until the user chooses Default or resets colors.

## Color and contrast

`palette.util.ts` computes WCAG relative luminance with the sRGB transfer function
and chooses whichever of black or white has the greater contrast ratio. This
choice is made independently for the background, surface, accent, and derived
hover/selected fills. Black or white always provides at least 4.58:1 contrast on
an opaque sRGB color.

`src/styles/components/_palette-theme.scss` scopes neutral ink to painted
containers, including cards, menus, dialogs, forms, selected tasks, and filled
buttons. Labels inherit that container's ink; icons and state shapes can use the
accent. The shared styles bridge Angular Material's component tokens and the
legacy palette aliases so these do not introduce another unrelated color.
State colors are not part of the palette: `--palette-warn-*` keeps Material's warn
red, and `--color-success`, `--color-warning` and `--color-danger` keep their
semantic values, so overdue dates, destructive actions and callout tones stay
distinct from the accent. Input placeholders use a muted share of their field's ink.
Disabled controls can still dim to communicate their state. Project/tag identity
colors remain available for their identifying icons/dots, rather than recoloring
the entire application. Wallpapers and per-project contrast/hue controls are no
longer shown or applied.

## Implementation tokens

`--palette-background`, `--palette-surface`, and `--palette-accent` hold the chosen
colors. Their `-ink` counterparts hold black or white. `--palette-selected` and
`--palette-hover` are opaque accent/surface mixes with corresponding `-ink`
tokens. `PaletteThemeService` writes them on the root element, together with every
`--palette-primary-*` and `--palette-accent-*` stop (all set to the accent), so
Angular Material's own component tokens follow the accent in both modes. Existing
`--surface-*`, `--brand`, `--text-color*`, and Material palette variables remain
internal compatibility aliases.

Focus: `--focus-ring` (and its alias `--focus-ring-color`) resolves to the body's
text ink, so custom controls show a black ring in light palettes and a white ring in
dark ones. Task rows use the accent (`--palette-primary-400`) for their focus and
multi-selection outlines. New components should use the
shared surface styles and semantic tokens, rather than hardcoded colors.

Native system bars use the background color and its contrasting icon style.
Chart axes/labels use neutral ink and tooltips pair the surface color with its
contrasting ink. Applying a palette writes shared tokens only when colors or
mode change; it does not inspect or subscribe to individual task rows.
