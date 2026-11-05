# Super Tasks identity

The production mark is [logo.svg](../../src/assets/super-tasks/logo.svg): a white continuous checkmark on emerald green, with generous clear space. Its raster export is [logo.png](../../src/assets/super-tasks/logo.png); desktop packaging uses the matching [512px PNG](../../build/super-tasks.png).

The built-in image generator was used for exploration. [generated-concept.png](generated-concept.png) preserves that exploration, but its texture was unsuitable for small icons. The production artwork is an intentionally flat vector implementation, not the textured generated image.

Final generation prompt: strictly flat two-color app icon; uniform opaque emerald green #16845B rounded square, white centered minimal checkmark under half the square width, even outer transparent margins, no text, holes, gradients, or texture.

The production SVG is the editable source of truth. Keep its transparent outer padding and checkmark proportions when exporting.
