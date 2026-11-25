import { expect, test } from '@playwright/test';

test('homepage exposes its three practical guides before the calculator', async ({ page }) => {
  await page.goto('/');

  const guides = page.getByTestId('featured-guides');
  await expect(guides).toBeVisible();
  await expect(guides.getByRole('heading', { name: 'Tre guider som gjør planleggingen enklere' })).toBeVisible();

  const links = guides.getByRole('link');
  await expect(links).toHaveCount(3);
  await expect(links.nth(0)).toHaveAttribute('href', '/guider/planlegg-barnebursdag-steg-for-steg');
  await expect(links.nth(1)).toHaveAttribute('href', '/guider/hvor-mye-mat-til-barnebursdag');
  await expect(links.nth(2)).toHaveAttribute('href', '/guider/slik-beregner-kakeklar');

  await page.getByTestId('wizard-skip').click();
  await expect(page.getByTestId('app')).toBeVisible();
  await expect(page.getByTestId('featured-guides')).toBeVisible();
  await expect(page.getByTestId('prisindeks-note')).toContainText('679,50 kr');
  await expect(page.getByTestId('prisindeks-note').getByRole('link')).toHaveAttribute('href', '/guider/prisindeks-bursdagskurv');
});
