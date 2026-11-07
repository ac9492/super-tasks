import { expect, test } from '../../fixtures/test.fixture';
import { openProjectViewMenu, selectProjectView } from '../../utils/project-view';

test.describe('Project layout switch', () => {
  test('switches a project between list, calendar and upcoming and remembers it per project', async ({
    page,
    projectPage,
    workViewPage,
  }) => {
    await workViewPage.waitForTaskList();
    await projectPage.createProject('Layout A');
    await projectPage.createProject('Layout B');

    await projectPage.navigateToProjectByName('Layout A');
    await workViewPage.waitForTaskList();

    await expect(page.locator('work-view-page segmented-button-group')).toHaveCount(0);
    await openProjectViewMenu(page);
    await expect(
      page.getByRole('menuitemradio', { name: 'List', exact: true }),
    ).toBeChecked();

    await selectProjectView(page, 'Calendar');
    await expect(page.locator('work-view-page schedule')).toBeVisible();
    await expect(page.locator('work-view')).toHaveCount(0);
    // calendar-provider events are opt-in inside a project
    await openProjectViewMenu(page);
    const calendarEvents = page.getByRole('menuitemcheckbox', {
      name: 'Show calendar events',
    });
    await expect(calendarEvents).not.toBeChecked();
    await calendarEvents.click();
    await expect(calendarEvents).toBeChecked();

    await selectProjectView(page, 'Upcoming');
    await expect(page.locator('work-view-page planner')).toBeVisible();

    // another project keeps its own (default) layout
    await projectPage.navigateToProjectByName('Layout B');
    await openProjectViewMenu(page);
    await expect(
      page.getByRole('menuitemradio', { name: 'List', exact: true }),
    ).toBeChecked();
    await page.keyboard.press('Escape');

    // the choice survives a reload (device-local storage)
    await projectPage.navigateToProjectByName('Layout A');
    await page.reload();
    await openProjectViewMenu(page);
    await expect(
      page.getByRole('menuitemradio', { name: 'Upcoming', exact: true }),
    ).toBeChecked();
    await expect(
      page.getByRole('menuitemcheckbox', { name: 'Show calendar events' }),
    ).toBeChecked();
    await page.screenshot({
      path: '.tmp/e2e-test-results/project-view-menu-desktop.png',
    });
    await page.keyboard.press('Escape');
    await expect(page.locator('work-view-page planner')).toBeVisible();
  });

  test('the upcoming layout only lists tasks planned in that project', async ({
    page,
    projectPage,
    workViewPage,
  }) => {
    await workViewPage.waitForTaskList();
    await projectPage.createProject('Scope A');
    await projectPage.createProject('Scope B');

    await projectPage.navigateToProjectByName('Scope A');
    await workViewPage.waitForTaskList();
    await workViewPage.addTask('Planned in A @tomorrow');

    await projectPage.navigateToProjectByName('Scope B');
    await workViewPage.waitForTaskList();
    await workViewPage.addTask('Planned in B @tomorrow');

    await projectPage.navigateToProjectByName('Scope A');
    await selectProjectView(page, 'Upcoming');

    const planner = page.locator('work-view-page planner');
    await expect(planner.getByText('Planned in A')).toBeVisible();
    await expect(planner.getByText('Planned in B')).toHaveCount(0);
  });
});
