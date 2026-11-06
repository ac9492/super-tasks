import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { GlobalThemeService } from '../global-theme.service';
import { PaletteThemeService } from '../palette-theme.service';
import { drawBlurredImage, drawGlassGradient } from './glass-backdrop.util';
import { Log } from '../../log';

/**
 * The blurred background behind the glass surfaces (web, mobile, Linux and
 * Windows 10; the macOS and Windows 11 desktop app use the OS material).
 * Drawn once per image, palette or mode change into a tiny canvas that CSS
 * stretches over the viewport: no live filter, no per-frame work.
 */
@Component({
  selector: 'glass-backdrop',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas
    #canvas
    [class.is-image]="isImageShown()"
  ></canvas>`,
  styleUrl: './glass-backdrop.component.scss',
})
export class GlassBackdropComponent {
  private readonly _globalThemeService = inject(GlobalThemeService);
  private readonly _paletteThemeService = inject(PaletteThemeService);

  /** A renderable image URL (data:, http(s):), or null for the gradient. */
  readonly imageUrl = input<string | null>(null);

  private readonly _canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  // The normalised roles the app paints with, not the raw picks.
  private readonly _colors = computed(() =>
    this._paletteThemeService.roles(this._globalThemeService.isDarkTheme()),
  );
  private readonly _image = signal<{
    state: 'none' | 'loading' | 'ready' | 'failed';
    element?: HTMLImageElement;
  }>({ state: 'none' });
  readonly isImageShown = computed(() => this._image().state === 'ready');

  constructor() {
    let requestId = 0;
    effect((onCleanup) => {
      const url = this.imageUrl();
      const currentRequest = ++requestId;
      if (!url) {
        this._image.set({ state: 'none' });
        return;
      }
      this._image.set({ state: 'loading' });
      const element = new Image();
      element.decoding = 'async';
      element.onload = () => {
        if (currentRequest === requestId) this._image.set({ state: 'ready', element });
      };
      element.onerror = () => {
        if (currentRequest !== requestId) return;
        // Static message: never log the URL, it is user content.
        Log.warn('Glass background image could not be loaded; using the gradient');
        this._image.set({ state: 'failed' });
      };
      element.src = url;
      onCleanup(() => {
        element.onload = null;
        element.onerror = null;
      });
    });

    effect(() => {
      const canvas = this._canvas().nativeElement;
      const image = this._image();
      if (image.state === 'ready' && image.element) {
        drawBlurredImage(canvas, image.element);
      } else if (image.state === 'loading') {
        // Briefly show the plain background instead of a gradient that the
        // image would replace a moment later.
        canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      } else {
        drawGlassGradient(canvas, this._colors());
      }
    });
  }
}
