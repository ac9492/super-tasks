import { TestBed } from '@angular/core/testing';
import { ProjectLayoutService } from './project-layout.service';
import { LS } from '../../core/persistence/storage-keys.const';

describe('ProjectLayoutService', () => {
  const key = (id: string): string => `${LS.PROJECT_LAYOUT}:${id}`;
  let service: ProjectLayoutService;

  beforeEach(() => {
    localStorage.removeItem(key('p1'));
    localStorage.removeItem(key('p2'));
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjectLayoutService);
  });

  afterEach(() => {
    localStorage.removeItem(key('p1'));
    localStorage.removeItem(key('p2'));
  });

  it('defaults to the list layout without calendar events', () => {
    expect(service.prefsFor('p1')).toEqual({
      layout: 'list',
      isShowCalendarEvents: false,
    });
  });

  it('stores the layout per project in localStorage', () => {
    service.setLayout('p1', 'calendar');

    expect(service.prefsFor('p1').layout).toBe('calendar');
    expect(service.prefsFor('p2').layout).toBe('list');
    expect(JSON.parse(localStorage.getItem(key('p1'))!).layout).toBe('calendar');
    expect(localStorage.getItem(key('p2'))).toBeNull();
  });

  it('restores the stored choice in a fresh instance', () => {
    service.setLayout('p1', 'upcoming');
    service.setShowCalendarEvents('p1', true);

    TestBed.resetTestingModule();
    const fresh = TestBed.inject(ProjectLayoutService);

    expect(fresh.prefsFor('p1')).toEqual({
      layout: 'upcoming',
      isShowCalendarEvents: true,
    });
  });

  it('falls back to list for an unknown stored layout', () => {
    localStorage.setItem(key('p1'), JSON.stringify({ layout: 'gantt' }));

    expect(service.prefsFor('p1').layout).toBe('list');
  });

  it('survives corrupt stored JSON', () => {
    localStorage.setItem(key('p1'), '{not json');

    expect(service.prefsFor('p1').layout).toBe('list');
  });
});
