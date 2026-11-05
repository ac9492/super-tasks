# Ultra Tasks identity

The production mark is [logo.svg](../../src/assets/ultra-tasks/logo.svg): a white, rounded, hand-drawn checkmark on a solid deep-teal (`#075b5e`) rounded square, with transparent outer padding. Its raster export is [logo.png](../../src/assets/ultra-tasks/logo.png); desktop packaging uses the matching [512px PNG](../../build/ultra-tasks.png). The app's default accent color uses the same teal; see [app icons](../app-icons.md) for the platform icon set.

The built-in image generator was used for early exploration. [generated-concept.png](generated-concept.png) preserves that exploration, but its texture was unsuitable for small icons. Earlier vector versions used an emerald (`#16845B`) tile, later shaped as a task note with a folded corner; the 0.1.0 release replaced them with the deep-teal square. The production artwork is an intentionally flat vector, not a generated image.

Historical generation prompt (exploration only; it does not describe the shipped colors): strictly flat two-color app icon; uniform opaque emerald green #16845B rounded square, white centered minimal checkmark under half the square width, even outer transparent margins, no text, holes, gradients, or texture.

The production SVG is the editable source of truth. Keep its transparent outer padding and checkmark proportions when exporting, and regenerate the platform icons as described in [app icons](../app-icons.md).
