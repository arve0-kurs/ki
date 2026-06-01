import { test, expect, Page } from '@playwright/test';

const uniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
const TEST_PASSWORD = 'testpass123';

async function loginAsNewUser(page: Page): Promise<string> {
  const email = uniqueEmail();
  await page.goto('/register');
  await page.fill('#email', email);
  await page.fill('#password', TEST_PASSWORD);
  await page.fill('#passwordConfirm', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('/timer');
  return email;
}

test.describe('Prosjektmapping (/projects)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsNewUser(page);
  });

  test('viser tom liste av prosjektmappinger', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.locator('h1')).toContainText('Prosjektmapping');
    await expect(page.locator('table tbody tr, p:has-text("Ingen")')).toBeTruthy();
  });

  test('kan opprette ny prosjektmapping', async ({ page }) => {
    await page.goto('/projects');
    await page.fill('#tag', 'kurs');
    await page.fill('#prosjekt', '100783 - Salg og markedsføring');
    await page.fill('#aktivitet', '250 - Markedsføring');
    await page.click('button[type="submit"]:has-text("Legg til")');
    await expect(page.locator('table')).toContainText('kurs');
    await expect(page.locator('table')).toContainText('100783 - Salg og markedsføring');
  });

  test('kan slette prosjektmapping', async ({ page }) => {
    await page.goto('/projects');
    await page.fill('#tag', 'slett-meg');
    await page.fill('#prosjekt', 'Testprosjekt');
    await page.fill('#aktivitet', 'Testaktivitet');
    await page.click('button[type="submit"]:has-text("Legg til")');
    await expect(page.locator('table')).toContainText('slett-meg');

    page.on('dialog', dialog => dialog.accept());
    await page.click('button[data-action="delete"]');
    await expect(page.locator('body')).not.toContainText('slett-meg');
  });
});

test.describe('Eksport (/api/export)', () => {
  test('returnerer tom array ved ingen tidtakinger for måneden', async ({ page }) => {
    await loginAsNewUser(page);

    const response = await page.request.get('/api/export?month=2000-01');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });

  test('eksporterer tidtakinger gruppert per tag+beskrivelse per dag, rundet til halvtime', async ({ page }) => {
    await loginAsNewUser(page);

    // Create a project mapping via UI
    await page.goto('/projects');
    await page.fill('#tag', 'kurs');
    await page.fill('#prosjekt', '100783 - KI-kurs');
    await page.fill('#aktivitet', '250 - Opplæring');
    await page.click('button[type="submit"]:has-text("Legg til")');

    // Start a timing
    const startResp = await page.request.post('/api/timings/start');
    expect(startResp.status()).toBe(200);
    const startHtml = await startResp.text();
    const idMatch = startHtml.match(/\/api\/timings\/([a-z0-9]+)\//);
    expect(idMatch).not.toBeNull();
    const timingId = idMatch![1];

    // Add tag
    await page.request.post(`/api/timings/${timingId}/add-tag`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: 'tag=kurs',
    });

    // Edit time to 2026-06-01 09:00 - 09:20 (20 min → rounds to 0.5h)
    await page.request.fetch(`/api/timings/${timingId}/edit-time`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: 'startTime=2026-06-01T09%3A00&stopTime=2026-06-01T09%3A20',
    });

    // Edit description
    await page.request.fetch(`/api/timings/${timingId}/edit-description`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: 'description=KI-kurs+dag+1',
    });

    const exportResp = await page.request.get('/api/export?month=2026-06');
    expect(exportResp.status()).toBe(200);
    const data = await exportResp.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const row = data[0];
    expect(row.date).toBe('2026-06-01');
    expect(row.prosjekt).toBe('100783 - KI-kurs');
    expect(row.aktivitet).toBe('250 - Opplæring');
    expect(row.tekst).toBe('KI-kurs dag 1');
    expect(row.timer).toBe(0.5); // 20 min rounds up to 0.5h
  });

  test('krever autentisering', async ({ request }) => {
    const response = await request.get('/api/export?month=2026-06');
    expect(response.status()).toBe(401);
  });

  test('eksport med manglende prosjektmapping inkluderer tom prosjekt/aktivitet', async ({ page }) => {
    await loginAsNewUser(page);

    // Start + stop timing with unknown tag
    const startResp = await page.request.post('/api/timings/start');
    const startHtml = await startResp.text();
    const idMatch = startHtml.match(/\/api\/timings\/([a-z0-9]+)\//);
    expect(idMatch).not.toBeNull();
    const timingId = idMatch![1];

    await page.request.post(`/api/timings/${timingId}/add-tag`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: 'tag=ukjent-tag',
    });

    await page.request.fetch(`/api/timings/${timingId}/edit-time`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: 'startTime=2026-06-01T10%3A00&stopTime=2026-06-01T10%3A30',
    });

    const exportResp = await page.request.get('/api/export?month=2026-06');
    expect(exportResp.status()).toBe(200);
    const data = await exportResp.json();
    const row = data.find((r: any) => r.prosjekt === '' && r.aktivitet === '');
    expect(row).toBeDefined();
    expect(row.timer).toBe(0.5); // 30 min = 0.5h exactly
  });
});
