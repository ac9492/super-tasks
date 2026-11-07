import { expect, Page } from '@playwright/test';

export const openProjectViewMenu = async (page: Page): Promise<void> => {
  const button = page.getByRole('button', { name: 'Project view', exact: true });
  const list = page.getByRole('menuitemradio', { name: 'List', exact: true });
  if (!(await list.isVisible())) await button.click();
  await expect(list).toBeVisible();
};

export const selectProjectView = async (
  page: Page,
  view: 'List' | 'Board' | 'Calendar' | 'Upcoming',
): Promise<void> => {
  await openProjectViewMenu(page);
  await page.getByRole('menuitemradio', { name: view, exact: true }).click();
  await expect(page.getByRole('menuitemradio', { name: view, exact: true })).toBeHidden();
};
