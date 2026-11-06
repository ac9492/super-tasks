import { TestBed } from '@angular/core/testing';
import { ConfigSoundFormComponent } from './config-sound-form.component';
import { SnackService } from '../../../core/snack/snack.service';

describe('sound previews', () => {
  it('plays, stops, switches clips and releases audio on destroy', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: SnackService, useValue: { open: jasmine.createSpy('open') } },
      ],
    });
    const clips: HTMLAudioElement[] = [];
    // eslint-disable-next-line prefer-arrow/prefer-arrow-functions -- Audio is called with new, so its test constructor must be constructible.
    spyOn(window, 'Audio').and.callFake(function () {
      const clip = {
        play: jasmine.createSpy('play').and.resolveTo(),
        pause: jasmine.createSpy('pause'),
        onended: null,
        volume: 0,
      } as unknown as HTMLAudioElement;
      clips.push(clip);
      return clip;
    });
    const component = TestBed.runInInjectionContext(() => new ConfigSoundFormComponent());
    component.soundForm.patchValue(
      { doneSound: 'done1.mp3', breakReminderSound: 'done2.mp3', volume: 40 },
      { emitEvent: false },
    );
    component.togglePreview('doneSound');
    expect(clips[0].volume).toBe(0.4);
    expect(component.previewing()).toBe('doneSound');
    component.togglePreview('breakReminderSound');
    expect(clips[0].pause).toHaveBeenCalled();
    expect(component.previewing()).toBe('breakReminderSound');
    component.togglePreview('breakReminderSound');
    expect(clips[1].pause).toHaveBeenCalled();
    expect(component.previewing()).toBeNull();
    component.togglePreview('doneSound');
    component.ngOnDestroy();
    expect(clips[2].pause).toHaveBeenCalled();
    expect(component.previewing()).toBeNull();
  });
});
