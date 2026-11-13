import { test, expect } from '@playwright/test';
import { Chess } from 'chess.js';
import { lessons } from '../src/course.js';
test.beforeEach(async ({ request }) => {
  const current = await (await request.get('/api/state')).json();
  await request.post('/api/state', { headers: { 'X-Chessnite-Key': current.key }, data: { revision: current.revision, state: {
    schemaVersion: 1, progress: {}, sessions: [], game: null,
    settings: { pieces: 'neo-wood', board: 'sage', sounds: false, motion: true },
  } } });
});
async function move(page, from, to) {
  await expect(page.locator('.chessboard')).toHaveAttribute('data-interactive', 'true');
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

test('undo while thinking ignores late bot responses', async ({ page }) => {
  await page.goto('/#play'); await page.getByRole('button', { name: 'Play from the start', exact: true }).click();
  await move(page, 'd2', 'd4'); await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('[data-square="d2"] img')).toHaveAttribute('alt', 'wp');
  await page.waitForTimeout(500);
  await expect(page.locator('.moves-panel').last().locator('small')).toHaveCount(0);
  await expect(page.locator('.game-status')).toContainText('Your move.');
});

test('imported board textures apply and remain selected after reload', async ({ page }) => {
  await page.goto('/#appearance');
  await page.getByLabel('Board image', { exact: true }).selectOption('ca09k-ohdxn');
  await expect(page.locator('.chessboard')).toHaveClass(/textured/);
  await saved(page); await page.reload();
  await expect(page.getByLabel('Board image', { exact: true })).toHaveValue('ca09k-ohdxn');
});

test('backup export and restore preserve lesson progress', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Start the course' }).click();
  await move(page, 'd2', 'd4'); await move(page, 'g1', 'f3'); await move(page, 'c1', 'f4'); await saved(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export backup' }).click();
  const file = await (await download).path();
  page.once('dialog', dialog => dialog.accept());
  await page.locator('input[type="file"]').setInputFiles(file); await saved(page);
  await page.reload(); await page.getByRole('button', { name: 'Learning path' }).click();
  await expect(page.locator('.stats-strip').first()).toContainText('1 / 10');
});

test('API refuses missing credentials, stale writes, and invalid backups', async ({ request }) => {
  const current = await (await request.get('/api/state')).json();
  expect((await request.post('/api/state', { data: { state: current.state, revision: current.revision } })).status()).toBe(403);
  const options = { headers: { 'X-Chessnite-Key': current.key }, data: { state: current.state, revision: current.revision } };
  expect((await request.post('/api/state', options)).status()).toBe(200);
  expect((await request.post('/api/state', options)).status()).toBe(409);
  expect((await request.post('/api/state', { headers: options.headers, data: { state: { schemaVersion: 99 }, revision: current.revision + 1 } })).status()).toBe(400);
});

test('the full study and engine experience works without internet requests', async ({ page }) => {
  await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:8766/') ? route.continue() : route.abort());
  await page.goto('/#play'); await page.getByRole('button', { name: 'Play from the London setup' }).click();
  await expect(page.locator('.game-status')).toHaveText('Your move. Take your time.', { timeout: 30000 });
  await expect(page.locator('.moves-panel').last()).toContainText('O-O');
});

for (const assisted of [false, true]) {
  test(`checkpoint persists an ${assisted ? 'assisted non-pass' : 'unassisted pass'}`, async ({ page }) => {
    await page.goto('/#practice');
    await page.locator('.practice-card').filter({ hasText: 'London checkpoint' }).click();
    if (assisted) await page.getByRole('button', { name: 'Switch to practice & show hint' }).click();
    const game = new Chess(), line = lessons.find(item => item.id === 'checkpoint');
    for (let index = 0; index < line.moves.length; index++) {
      const played = game.move(line.moves[index]);
      if (index % 2 === 0) await move(page, played.from, played.to);
    }
    await expect(page.getByRole('heading', { name: assisted ? 'A little more practice.' : 'Another idea, understood.' })).toBeVisible();
    await saved(page); await page.reload();
    await expect(page.getByRole('heading', { name: assisted ? 'A little more practice.' : 'Another idea, understood.' })).toBeVisible();
  });
}

test('drag follows the pointer, lands without a second glide, and rejects illegal drops', async ({ page }) => {
  await page.goto('/#play'); await page.getByRole('button', { name: 'Play from the start', exact: true }).click();
  async function center(square) { const rect = await page.locator(`[data-square="${square}"]`).boundingBox(); return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }; }
  const from = await center('d2'), illegal = await center('d5'), to = await center('d4');
  await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(illegal.x, illegal.y, { steps: 8 });
  await expect(page.getByTestId('drag-piece')).toBeVisible();
  await expect(page.locator('[data-square="d2"] .board-piece')).toHaveClass(/piece-hidden/);
  await page.mouse.up();
  await expect(page.getByTestId('drag-piece')).toHaveCount(0);
  await expect(page.locator('[data-square="d2"] img')).toHaveAttribute('alt', 'wp');
  await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 8 });
  const started = Date.now(); await page.mouse.up();
  await expect(page.locator('[data-square="d4"] img')).toHaveAttribute('alt', 'wp');
  await expect(page.locator('[data-motion="slide"]')).toHaveCount(0);
  await expect(page.locator('.game-status')).toContainText('thinking');
  await expect(page.locator('.game-status')).toHaveText('Your move. Take your time.', { timeout: 10000 });
  expect(Date.now() - started).toBeGreaterThanOrEqual(900);
});

test('click moves glide and lesson replies are separate delayed moves', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Start the course' }).click();
  await move(page, 'd2', 'd4');
  await expect(page.locator('[data-motion="slide"]')).toHaveCount(1);
  await expect(page.locator('[data-square="d7"] img')).toHaveAttribute('alt', 'bp');
  await expect(page.locator('.chessboard')).toHaveAttribute('data-interactive', 'false');
  await expect(page.locator('[data-square="d5"] img')).toHaveAttribute('alt', 'bp');
  await expect(page.locator('.chessboard')).toHaveAttribute('data-interactive', 'true');
});

async function seedPosition(request, game) {
  const current = await (await request.get('/api/state')).json();
  current.state.game = { id: 'animation-test', pgn: game.pgn(), side: 'w', startedAt: new Date().toISOString() };
  await request.post('/api/state', { headers: { 'X-Chessnite-Key': current.key }, data: { state: current.state, revision: current.revision } });
}
test('castling animates king and rook together', async ({ page, request }) => {
  const game = new Chess(); lessons.find(item => item.id === 'castle').moves.slice(0, -1).forEach(move => game.move(move));
  await seedPosition(request, game); await page.goto('/#play'); await move(page, 'e1', 'g1');
  await expect(page.locator('[data-motion="slide"]')).toHaveCount(2);
  await expect(page.locator('[data-square="f1"] img')).toHaveAttribute('alt', 'wr');
});
test('en passant and promotion keep correct pieces while animating', async ({ page, request }) => {
  const game = new Chess(); ['e4','a6','e5','d5'].forEach(move => game.move(move));
  await seedPosition(request, game); await page.goto('/#play'); await move(page, 'e5', 'd6');
  await expect(page.locator('[data-square="d5"] img')).toHaveCount(0);
  await expect(page.locator('[data-square="d6"] img')).toHaveAttribute('alt', 'wp');
  await page.goto('/#learn'); await saved(page);
  await seedPosition(request, new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1'));
  await page.reload(); await page.getByRole('button', { name: 'Play Robin', exact: true }).click();
  await move(page, 'a7', 'a8'); await page.getByRole('button', { name: 'Queen', exact: true }).click();
  await expect(page.locator('[data-square="a8"] img')).toHaveAttribute('alt', 'wq');
});
