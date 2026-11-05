# Ultra Tasks app icon

The official icon is **Faceted**: a white octagonal comet head with three straight,
geometric trails on a solid deep-teal (`#075b5e`) rounded square. The approved
artwork is maintained as a vector in
[`src/assets/ultra-tasks/logo.svg`](../src/assets/ultra-tasks/logo.svg).

The master preserves the approved geometry with one compound path for the head
and all three trails. Its transparent outer padding follows desktop icon
conventions; mobile assets use the same artwork within their platform masks.

Regenerate platform assets after editing that master:

```sh
npm run generate:icons
npm run test:mac-icon
```

The generator uses the existing pinned Sharp tool installation under
`.tmp/mac-icon-tools`; it does not add dependencies to the application.

## Platform representations

- **Windows and Linux:** `build/icon.png`, `build/icon.ico`, and `build/icons/`
  contain the rounded-square artwork with transparent outer padding. Electron's
  window icon uses the same artwork in `electron/assets/icons/icon_256x256.png`.
  Windows Store tiles and splash images in `build/appx/` retain their required
  canvas sizes; notification badges use the monochrome glyph.
- **macOS:** `build/icon-mac.svg` is generated from the master, followed by the ten
  representations in `build/icon.iconset/` and the verified `build/icon.icns`.
  Packaging on macOS recompiles that iconset with `iconutil`.
- **Web:** the navigation/loading logo, favicons, PWA install icons, and Microsoft
  tile image use the same rounded square. Safari pinned tabs use the monochrome
  comet with the deep-teal tint declared in `src/index.html`.
- **iOS and Apple touch icons:** the square, opaque artwork in `build/icons/sq*`
  fills the background with teal. iOS applies its rounded-square mask. The iOS
  app icon is a 1024-pixel RGB PNG without an alpha channel.
  The three iOS splash images use the rounded-square artwork centered on their
  existing white canvas.
- **Android:** both legacy launcher resources use the rounded-square artwork.
  Adaptive icons use a teal background and the same comet within the safe
  zone. Android launchers choose their own outer mask, including circular masks;
  this cannot be forced to a rounded square by the artwork. Store artwork uses
  the opaque square source so the store can apply its own mask.
- **Tray and notification icons:** use the same comet as a monochrome glyph
  so system tinting, menu-bar inversion, and notification rendering work. The
  play/progress indicators keep their existing time-tracking meaning.

Generated files should not be edited individually. `generate:mac-icon` and
`generate:ios-icon` remain available for their individual packaging workflows;
use `generate:icons` to propagate a master-artwork change everywhere.
