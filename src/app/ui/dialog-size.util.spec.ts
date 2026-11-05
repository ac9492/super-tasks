import { dialogSize } from './dialog-size.util';

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
