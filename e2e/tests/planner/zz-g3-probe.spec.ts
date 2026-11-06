import { expect, test } from '../../fixtures/test.fixture';
import { openTaskDetailPanel } from '../../utils/schedule-task-helper';
test.use({ viewport: { width: Number(process.env.VW || 1280), height: Number(process.env.VH || 720) } });
test('probe', async ({ page, workViewPage, testPrefix }) => {
  await workViewPage.waitForTaskList();
  if (Number(process.env.VW || 1280) < 600) {
    await page.locator('mobile-bottom-nav .add-task-button').click();
    const input = page.locator('add-task-bar .main-input').first();
    await input.waitFor({ state: 'visible' });
    await input.fill(`${testPrefix}-probe`);
    await input.press('Enter');
    await page.keyboard.press('Escape');
  } else {
    await workViewPage.addTask(`${testPrefix}-probe`);
  }
  const task = page.locator(`task:has-text("${testPrefix}-probe")`).first();
  await task.waitFor({ state: 'visible' });
  await openTaskDetailPanel(page, task);
  await page.locator('task-detail-item:has(mat-icon:text("today")), task-detail-item:has(mat-icon:text("alarm")), task-detail-item:has(mat-icon:text("schedule"))').first().click();
  const dialog = page.locator('dialog-schedule-task');
  await dialog.waitFor({ state: 'visible' });
  await page.waitForTimeout(800);
  if (process.env.FILL) { await page.locator('dialog-schedule-task input[type="time"]').fill('23:00'); await page.waitForTimeout(600); }
  const info = await page.evaluate(() => {
    const r = (sel: string) => { const e = document.querySelector(sel) as HTMLElement | null; if (!e) return null; const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { top: b.top, bottom: b.bottom, h: b.height, w: b.width, maxH: cs.maxHeight, ov: cs.overflowY, disp: cs.display }; };
    return {
      pane: r('.mat-mdc-dialog-panel'), submit: r('[data-test-id="schedule-submit-btn"]'), surface: r('.mat-mdc-dialog-surface'), container: r('mat-dialog-container'), content: r('dialog-schedule-task mat-dialog-content'), actions: r('dialog-schedule-task mat-dialog-actions'), host: r('dialog-schedule-task'), title: r('dialog-schedule-task h2'), vh: window.innerHeight,
    };
  });
  const chain = await page.evaluate(() => {
    const out: any[] = [];
    let e = document.querySelector('dialog-schedule-task') as HTMLElement | null;
    while (e && e.tagName !== 'BODY') {
      const cs = getComputedStyle(e); const b = e.getBoundingClientRect();
      out.push(`${e.tagName.toLowerCase()}.${(e.className||'').toString().split(' ').slice(0,3).join('.')} disp=${cs.display} dir=${cs.flexDirection} h=${Math.round(b.height)} H=${cs.height} maxH=${cs.maxHeight} minH=${cs.minHeight} ov=${cs.overflowY} pos=${cs.position}`);
      e = e.parentElement;
    }
    return out;
  });
  console.log(chain.join('\n'));
  await page.screenshot({ path: process.env.OUT || '/tmp/probe.png' });
});
