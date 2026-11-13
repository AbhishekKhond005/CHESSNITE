import { test, expect } from '@playwright/test';
test.beforeEach(async ({ request }) => {
  const current = await (await request.get('/api/state')).json();
  await request.post('/api/state', { headers: { 'X-Chessnite-Key': current.key }, data: { revision: current.revision, state: {
    schemaVersion: 1, progress: {}, sessions: [], game: null,
    settings: { pieces: 'neo-wood', board: 'sage', sounds: false, motion: true },
  } } });
});
async function move(page, from, to) {
  await page.locator(`[data-square="${from}"]`).click();
  await page.locator(`[data-square="${to}"]`).click();
}
async function saved(page) { await expect(page.locator('.sidebar-bottom')).toContainText('Saved on this device'); }
test('learn a London line, keep completion and resume after reload', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your next move starts here.' })).toBeVisible();
  await page.getByRole('button', { name: 'Start the course' }).click();
  await move(page, 'd2', 'd4'); await move(page, 'g1', 'f3'); await move(page, 'c1', 'f4');
  await expect(page.getByRole('heading', { name: 'Another idea, understood.' })).toBeVisible();
  await saved(page); await page.reload();
  await expect(page.getByRole('heading', { name: 'Another idea, understood.' })).toBeVisible();
  await page.getByRole('button', { name: 'Your sessions' }).click();
  await expect(page.locator('.session-row')).toContainText('Start with the center');
  expect(errors).toEqual([]);
});
test('an unfinished lesson restores the exact position and skin changes persist', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Start the course' }).click();
  await move(page, 'd2', 'd4'); await saved(page); await page.reload();
  await expect(page.locator('[data-square="d4"] img')).toHaveAttribute('alt', 'wp');
  await expect(page.locator('[data-square="d5"] img')).toHaveAttribute('alt', 'bp');
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page.locator('.piece-option').filter({ hasText: 'uqihi + bin2s' }).click();
  await page.getByRole('button', { name: 'Walnut', exact: true }).click(); await saved(page); await page.reload();
  await expect(page.locator('[data-square="g1"] img')).toHaveAttribute('src', /uqihi-bin2s/);
  await expect(page.getByRole('button', { name: 'Walnut', exact: true })).toHaveClass(/chosen/);
});
test('real WASM opponent plays a legal reply, resumes, and handles undo', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#play'); await page.getByRole('button', { name: 'Play from the start', exact: true }).click();
  await move(page, 'd2', 'd4');
  await expect(page.locator('.game-status')).toHaveText('Your move. Take your time.', { timeout: 30000 });
  await expect(page.locator('.moves-panel').last().locator('span small')).toHaveCount(1);
  await expect(page.locator('.moves-panel').last()).toContainText('d4');
  await saved(page); const history = await page.locator('.moves-panel').last().textContent(); await page.reload();
  await expect(page.locator('.moves-panel').last()).toHaveText(history);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('[data-square="d2"] img')).toHaveAttribute('alt', 'wp');
  await expect(page.locator('.game-status')).toContainText('Your move.'); expect(errors).toEqual([]);
});
test('bot calculates the first move when playing Black', async ({ page }) => {
  await page.goto('/#play'); await page.getByRole('button', { name: 'Black', exact: true }).click();
  await page.getByRole('button', { name: 'Play from the start', exact: true }).click();
  await expect(page.locator('.game-status')).toHaveText('Your move. Take your time.', { timeout: 30000 });
  await expect(page.locator('.moves-panel').last().locator('span small')).toHaveCount(1);
  await expect(page.locator('.chessboard button').first()).toHaveAttribute('data-square', 'h1');
});
test('mobile layout fits the viewport and the course is reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start the course' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Start the course' }).click();
  await expect(page.locator('.chessboard')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
