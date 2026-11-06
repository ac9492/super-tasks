import { contrastingInk, mixColors, PaletteColors } from '../palette.util';

/** The two image fields of the synced misc config (strings, '' when cleared). */
export interface GlassBackgroundImageCfg {
  backgroundImageDark?: string | null;
  backgroundImageLight?: string | null;
}

const isImageSet = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * The glass backdrop is drawn once per change into a tiny canvas that CSS
 * stretches over the viewport. Upscaling a small bitmap is smooth and reads as
 * a heavy blur, so nothing filters live on every frame.
 */
export const GLASS_GRADIENT_SIZE = { width: 64, height: 40 } as const;
/** Long edge of the drawn image; at 1920 px wide the blur is about 30 px. */
export const GLASS_IMAGE_EDGE = 192;
export const GLASS_IMAGE_BLUR_PX = 3;
/** Drawn larger than the canvas so the blur never samples a transparent edge. */
const IMAGE_BLEED = 1.1;

export interface GlassGradientGlow {
  /** Centre and radius as fractions of the canvas width/height. */
  x: number;
  y: number;
  radius: number;
  color: string;
}

export interface GlassGradientRecipe {
  base: string;
  glows: GlassGradientGlow[];
}

/**
 * A soft gradient from the palette roles only, so any palette (including
 * normalised ones) yields an on-brand backdrop: the accent glows top-left, a
 * deeper accent bottom-right, and the card color lifts the top-right.
 */
export const glassGradientRecipe = (colors: PaletteColors): GlassGradientRecipe => {
  const ink = contrastingInk(colors.background);
  return {
    base: colors.background,
    glows: [
      {
        x: 0.05,
        y: 0,
        radius: 0.95,
        color: mixColors(colors.background, colors.accent, 0.7),
      },
      {
        x: 1,
        y: 1,
        radius: 0.9,
        color: mixColors(colors.background, mixColors(colors.accent, ink, 0.35), 0.6),
      },
      {
        x: 0.85,
        y: 0.15,
        radius: 0.55,
        color: mixColors(colors.background, colors.surface, 0.8),
      },
    ],
  };
};

export const drawGlassGradient = (
  canvas: HTMLCanvasElement,
  colors: PaletteColors,
): void => {
  const { width, height } = GLASS_GRADIENT_SIZE;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const recipe = glassGradientRecipe(colors);
  ctx.fillStyle = recipe.base;
  ctx.fillRect(0, 0, width, height);
  const size = Math.max(width, height);
  for (const glow of recipe.glows) {
    const x = glow.x * width;
    const y = glow.y * height;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, glow.radius * size);
    gradient.addColorStop(0, glow.color);
    // Same hue at zero alpha, so the falloff never passes through grey.
    gradient.addColorStop(1, `${glow.color}00`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
};

/** The gradient as a tiny PNG, for previews (kept in memory only). */
export const glassGradientDataUrl = (colors: PaletteColors): string => {
  const canvas = document.createElement('canvas');
  drawGlassGradient(canvas, colors);
  return canvas.toDataURL('image/png');
};

/** Draws the image small and blurred, keeping its aspect (CSS covers). */
export const drawBlurredImage = (
  canvas: HTMLCanvasElement,
  image: CanvasImageSource & { width: number; height: number },
): void => {
  const scale = GLASS_IMAGE_EDGE / Math.max(image.width, image.height, 1);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const drawWidth = width * IMAGE_BLEED;
  const drawHeight = height * IMAGE_BLEED;
  const left = (width - drawWidth) / 2;
  const top = (height - drawHeight) / 2;
  ctx.filter = `blur(${GLASS_IMAGE_BLUR_PX}px)`;
  if (ctx.filter.startsWith('blur')) {
    ctx.drawImage(image, left, top, drawWidth, drawHeight);
    return;
  }
  // No canvas filter (older WebKit): a coarse pass upscaled reads as blur.
  const coarse = document.createElement('canvas');
  coarse.width = Math.max(1, Math.round(width / 6));
  coarse.height = Math.max(1, Math.round(height / 6));
  coarse.getContext('2d')?.drawImage(image, 0, 0, coarse.width, coarse.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(coarse, left, top, drawWidth, drawHeight);
};

/**
 * The image behind the glass for the current mode: that mode's own image,
 * else the other mode's (the glass tint keeps text contrast either way), else
 * none and the palette gradient shows.
 */
export const pickGlassBackgroundImage = (
  misc: GlassBackgroundImageCfg | undefined,
  isDark: boolean,
): string | null => {
  const own = isDark ? misc?.backgroundImageDark : misc?.backgroundImageLight;
  const other = isDark ? misc?.backgroundImageLight : misc?.backgroundImageDark;
  if (isImageSet(own)) return own;
  if (isImageSet(other)) return other;
  return null;
};
