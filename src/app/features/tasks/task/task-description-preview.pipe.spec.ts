import { TaskDescriptionPreviewPipe } from './task-description-preview.pipe';

describe('TaskDescriptionPreviewPipe', () => {
  const pipe = new TaskDescriptionPreviewPipe();

  it('returns an empty string for no description', () => {
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform('  \n \n')).toBe('');
  });

  it('uses the first non-empty line', () => {
    expect(pipe.transform('\n\nCall the agency\nthen file the form')).toBe(
      'Call the agency',
    );
  });

  it('drops list, checkbox, heading and quote markers', () => {
    expect(pipe.transform('- item')).toBe('item');
    expect(pipe.transform('* [ ] open item')).toBe('open item');
    expect(pipe.transform('- [x] done item')).toBe('done item');
    expect(pipe.transform('2. second')).toBe('second');
    expect(pipe.transform('## Heading')).toBe('Heading');
    expect(pipe.transform('> quoted')).toBe('quoted');
  });

  it('keeps text that only looks like a marker', () => {
    expect(pipe.transform('-5 degrees')).toBe('-5 degrees');
    expect(pipe.transform('#tag')).toBe('#tag');
  });
});
