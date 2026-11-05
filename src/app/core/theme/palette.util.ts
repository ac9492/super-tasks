export interface PaletteColors {
  background: string;
  surface: string;
  accent: string;
}

export interface PalettePair {
  light: PaletteColors;
  dark: PaletteColors;
}

export const DEFAULT_PALETTE: PalettePair = {
  light: { background: '#f8f8f7', surface: '#ffffff', accent: '#397f86' },
  dark: { background: '#131314', surface: '#242426', accent: '#80cbc4' },
};

export const isPaletteColors = (value: unknown): value is PaletteColors => {
  if (typeof value !== 'object' || value === null) return false;
  const colors = value as Record<string, unknown>;
  return ['background', 'surface', 'accent'].every(
    (key) => typeof colors[key] === 'string' && /^#[\da-f]{6}$/i.test(colors[key]),
  );
};

export const colorChannels = (hex: string): number[] =>
  [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));

/** WCAG relative luminance, including the sRGB transfer function. */
export const relativeLuminance = (hex: string): number => {
  const channels = colorChannels(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const red = channels[0] * 0.2126;
  const green = channels[1] * 0.7152;
  const blue = channels[2] * 0.0722;
  return red + green + blue;
};

/** Black and white always include a choice with at least 4.58:1 contrast. */
export const contrastingInk = (hex: string): '#000000' | '#ffffff' => {
  const luminance = relativeLuminance(hex);
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#000000' : '#ffffff';
};

/** Opaque states get their own ink, including palettes near the contrast crossover. */
export const mixColors = (base: string, overlay: string, weight: number): string => {
  const baseChannels = colorChannels(base);
  return `#${colorChannels(overlay)
    .map((channel, index) => {
      const basePart = baseChannels[index] * (1 - weight);
      const overlayPart = channel * weight;
      return Math.round(basePart + overlayPart)
        .toString(16)
        .padStart(2, '0');
    })
    .join('')}`;
};
