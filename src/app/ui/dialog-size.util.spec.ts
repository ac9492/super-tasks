import { Injector, runInInjectionContext } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { dialogSize, useDialogSize } from './dialog-size.util';

describe('dialogSize', () => {
  it('should map each size to its panel class', () => {
    expect(dialogSize('s')).toEqual({ panelClass: 'dialog-s' });
    expect(dialogSize('m')).toEqual({ panelClass: 'dialog-m' });
    expect(dialogSize('l')).toEqual({ panelClass: 'dialog-l' });
    expect(dialogSize('window')).toEqual({ panelClass: 'dialog-window' });
  });

  it('should keep extra panel classes next to the size class', () => {
    expect(dialogSize('window', 'settings-window')).toEqual({
      panelClass: ['dialog-window', 'settings-window'],
    });
  });
});

describe('useDialogSize', () => {
  const run = (ref: unknown): void => {
    const injector = Injector.create({
      providers: ref === undefined ? [] : [{ provide: MatDialogRef, useValue: ref }],
    });
    runInInjectionContext(injector, () => useDialogSize('m'));
  };

  it('should add the size class to the dialog panel', () => {
    const addPanelClass = jasmine.createSpy('addPanelClass');
    run({ addPanelClass });
    expect(addPanelClass).toHaveBeenCalledWith('dialog-m');
  });

  it('should do nothing outside a dialog or with a ref that cannot take classes', () => {
    expect(() => run(undefined)).not.toThrow();
    expect(() => run({})).not.toThrow();
  });
});
