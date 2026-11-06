import { expect, test } from '../../fixtures/test.fixture';

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

    const layoutGroup = page.getByRole('radiogroup', { name: 'Project layout' });
    await expect(layoutGroup).toBeVisible();
    await expect(layoutGroup.getByRole('radio', { name: 'List' })).toBeChecked();

    await layoutGroup.getByRole('radio', { name: 'Calendar' }).click();
    await expect(page.locator('work-view-page schedule')).toBeVisible();
    await expect(page.locator('work-view')).toHaveCount(0);
    // calendar-provider events are opt-in inside a project
    await expect(
      page.getByRole('switch', { name: 'Show calendar events' }),
    ).not.toBeChecked();

    await layoutGroup.getByRole('radio', { name: 'Upcoming' }).click();
    await expect(page.locator('work-view-page planner')).toBeVisible();

    // another project keeps its own (default) layout
    await projectPage.navigateToProjectByName('Layout B');
    await expect(
      page
        .getByRole('radiogroup', { name: 'Project layout' })
        .getByRole('radio', { name: 'List' }),
    ).toBeChecked();

    // the choice survives a reload (device-local storage)
    await projectPage.navigateToProjectByName('Layout A');
    await page.reload();
    await expect(
      page
        .getByRole('radiogroup', { name: 'Project layout' })
        .getByRole('radio', { name: 'Upcoming' }),
    ).toBeChecked();
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
    await page
      .getByRole('radiogroup', { name: 'Project layout' })
      .getByRole('radio', { name: 'Upcoming' })
      .click();

    const planner = page.locator('work-view-page planner');
    await expect(planner.getByText('Planned in A')).toBeVisible();
    await expect(planner.getByText('Planned in B')).toHaveCount(0);
  });
});
