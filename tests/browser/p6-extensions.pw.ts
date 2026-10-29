import { expect, test } from '@playwright/test';

test('P6D mock translation is a separate review aid and leaves the P1 card unchanged', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Analyze Text' }).click();
  const card = page.getByRole('article', { name: 'task card', exact: true });
  const before = await card.innerText();
  const translation = page.getByRole('region', { name: 'Optional card translation' });
  await expect(translation).toContainText('Deterministic mock only');
  const translated = translation.getByRole('group', { name: 'task translation' });
  await translated.getByRole('button', { name: 'Create mock translation' }).click();
  await expect(translated).toContainText('檢查 sandbox credentials');
  await expect(translated).toContainText('deterministic-mock / phrasebook-v1');
  await expect(card).toContainText('draft');
  await expect(card).toContainText('Check sandbox credentials');
  expect(await card.innerText()).toBe(before);
});

test('P6E routine run converts only through parser and exports a normal draft Workspace for P6A', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Analyze Text' }).click();
  const routines = page.getByRole('region', { name: 'Routine templates' });
  const items = routines.getByLabel('Routine items (one title per line)');
  await items.fill('Check sandbox credentials\nReview payment webhook');
  await items.press('Tab');
  await expect(routines.getByLabel('Template').locator('option').first()).toHaveText(/v2/);
  await routines.getByRole('button', { name: 'Create draft run' }).click();
  await expect(routines).toContainText('Draft routine only');
  await routines.getByRole('button', { name: 'Confirm reviewed item' }).first().click();
  await expect(routines.getByText('confirmed').first()).toBeVisible();
  const conversion = routines.getByRole('region', { name: 'P1 encrypted collaboration conversion' });
  await expect(conversion).toContainText('2/2 routine items parsed');
  await expect(conversion).toContainText('all parser evidence verified');
  const downloadPromise = page.waitForEvent('download');
  page.once('dialog', dialog => dialog.accept());
  await conversion.getByRole('button', { name: 'Create draft Workspace JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('codeswitch-routine-p1-workspace.json');
  const path = await download.path();
  expect(path).toBeTruthy();
  const fs = await import('node:fs/promises');
  const bundle = JSON.parse(await fs.readFile(path!, 'utf8')) as { format: string; workspace: { cards: { current: { status: string; requiresConfirmation: boolean; evidence: { text: string; start: number; end: number } } }[] } };
  expect(bundle.format).toBe('codeswitch-workspace');
  expect(bundle.workspace.cards).toHaveLength(2);
  expect(bundle.workspace.cards.every(card => card.current.status === 'draft' && card.current.requiresConfirmation)).toBe(true);
  for (const state of bundle.workspace.cards) expect('Check sandbox credentials\nReview payment webhook'.slice(state.current.evidence.start, state.current.evidence.end)).toBe(state.current.evidence.text);
});
