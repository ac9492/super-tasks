import { dialogSize } from './dialog-size.util';

describe('dialogSize', () => {
  it('should map each size to its panel class', () => {
    expect(dialogSize('s')).toEqual({ panelClass: 'dialog-s' });
    expect(dialogSize('m')).toEqual({ panelClass: 'dialog-m' });
    expect(dialogSize('l')).toEqual({ panelClass: 'dialog-l' });
  });
});
