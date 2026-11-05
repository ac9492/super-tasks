import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GlassBackdropComponent } from './glass-backdrop.component';
import { GlobalThemeService } from '../global-theme.service';
import { PaletteThemeService } from '../palette-theme.service';
import { DEFAULT_PALETTE } from '../palette.util';
import { GLASS_GRADIENT_SIZE, GLASS_IMAGE_EDGE } from './glass-backdrop.util';

// A 2×1 red PNG.
const RED_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAAD0lEQVR4nGP8z8DAwMAAAAYIAQHLR3Z1AAAAAElFTkSuQmCC';

describe('GlassBackdropComponent', () => {
  let fixture: ComponentFixture<GlassBackdropComponent>;
  const isDarkTheme = signal(false);

  const canvas = (): HTMLCanvasElement =>
    fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
  const waitFor = async (check: () => boolean): Promise<void> => {
    for (let i = 0; i < 50 && !check(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      fixture.detectChanges();
    }
  };

  beforeEach(() => {
    isDarkTheme.set(false);
    TestBed.configureTestingModule({
      imports: [GlassBackdropComponent],
      providers: [
        { provide: GlobalThemeService, useValue: { isDarkTheme } },
        {
          provide: PaletteThemeService,
          useValue: { palettes: signal(DEFAULT_PALETTE) },
        },
      ],
    });
    fixture = TestBed.createComponent(GlassBackdropComponent);
  });

  it('draws the palette gradient without an image', () => {
    fixture.detectChanges();
    expect([canvas().width, canvas().height]).toEqual([
      GLASS_GRADIENT_SIZE.width,
      GLASS_GRADIENT_SIZE.height,
    ]);
    expect(canvas().classList).not.toContain('is-image');
    const style = getComputedStyle(fixture.nativeElement);
    expect(style.position).toBe('fixed');
    expect(style.zIndex).toBe('-1');
    expect(style.pointerEvents).toBe('none');
  });

  it('redraws the gradient for the dark palette', () => {
    fixture.detectChanges();
    const lightCorner = Array.from(
      canvas().getContext('2d')!.getImageData(63, 39, 1, 1).data,
    );
    isDarkTheme.set(true);
    fixture.detectChanges();
    const darkCorner = Array.from(
      canvas().getContext('2d')!.getImageData(63, 39, 1, 1).data,
    );
    expect(darkCorner).not.toEqual(lightCorner);
  });

  it('draws a loaded image small and blurred, covering the viewport', async () => {
    fixture.componentRef.setInput('imageUrl', RED_PNG);
    fixture.detectChanges();
    await waitFor(() => canvas().classList.contains('is-image'));
    expect(canvas().classList).toContain('is-image');
    expect(canvas().width).toBe(GLASS_IMAGE_EDGE);
    expect(canvas().height).toBe(GLASS_IMAGE_EDGE / 2);
  });

  it('falls back to the gradient when the image cannot load', async () => {
    fixture.componentRef.setInput('imageUrl', 'data:image/png;base64,broken');
    fixture.detectChanges();
    await waitFor(() => canvas().width === GLASS_GRADIENT_SIZE.width);
    expect(canvas().width).toBe(GLASS_GRADIENT_SIZE.width);
    expect(canvas().classList).not.toContain('is-image');
  });
});
