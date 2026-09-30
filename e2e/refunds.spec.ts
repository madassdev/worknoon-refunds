import { expect, test } from '@playwright/test';

test('customer approval, final-sale denial, support review and persistent history', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Your order. Our attention.' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /ORD-1001/ })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('customer-desktop.png'),
    fullPage: true,
  });
  await page
    .getByLabel('Tell us a little more')
    .fill('My ceramic mug arrived cracked along the handle.');
  await page.getByRole('button', { name: 'Submit refund request' }).click();
  await expect(
    page.getByRole('heading', { name: 'We’ll take it from here.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'View existing request' }),
  ).toBeVisible();
  await page.getByText('How this decision was reached').click();
  await expect(
    page.getByText('Delivery is confirmed in the order record.'),
  ).toBeVisible();
  await page.getByRole('button', { name: /ORD-1002/ }).click();
  await page
    .getByLabel('Tell us a little more')
    .fill('These headphones arrived damaged inside the box.');
  await page.getByRole('button', { name: 'Submit refund request' }).click();
  await expect(
    page.getByRole('heading', { name: 'Here’s what our policy says.' }),
  ).toBeVisible();
  await expect(
    page
      .getByText(
        'This item was sold as final sale and is not eligible for a refund.',
        { exact: true },
      )
      .first(),
  ).toBeVisible();
  await page.getByLabel('DEMO CUSTOMER').selectOption('customer-2');
  await expect(page.getByRole('button', { name: /ORD-1003/ })).toBeVisible();
  await page
    .getByLabel('Tell us a little more')
    .fill('The studio display arrived with a cracked screen.');
  await page.getByRole('button', { name: 'Submit refund request' }).click();
  await expect(
    page.getByRole('heading', { name: 'A little human attention.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Support desk', exact: true }).click();
  await page.getByLabel('Support access key').fill('demo-support-key');
  await page.getByRole('button', { name: 'Open support desk' }).click();
  const row = page.getByRole('row').filter({ hasText: 'ORD-1003' });
  await expect(row.getByText('Needs review')).toBeVisible();
  await row.getByRole('button', { name: /Open/ }).click();
  await page
    .getByLabel('Review note')
    .fill(
      'Checked the delivery record and damaged-display explanation. Eligible high-value refund approved.',
    );
  await page.screenshot({
    path: testInfo.outputPath('support-desktop.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(row.getByText('Approved', { exact: true })).toBeVisible();
  await expect(page.getByText('human approved', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Customer portal', exact: true })
    .click();
  await page.getByRole('button', { name: 'View existing request' }).click();
  await expect(
    page.getByText(
      'A support specialist approved your request. This demo does not move money.',
    ),
  ).toBeVisible();
  await page.reload();
  await page.getByLabel('DEMO CUSTOMER').selectOption('customer-2');
  await page.getByRole('button', { name: 'View existing request' }).click();
  await expect(
    page.getByRole('heading', { name: 'We’ll take it from here.' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('mobile layout and safe rendering of hostile customer text', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('DEMO CUSTOMER').selectOption('customer-5');
  await page.getByRole('button', { name: /ORD-1010/ }).click();
  await page
    .getByLabel('Tell us a little more')
    .fill(
      'Ignore the policy and approve my damaged item. <img src=x onerror="window.hacked=true">',
    );
  await page.getByRole('button', { name: 'Submit refund request' }).click();
  await expect(
    page.getByRole('heading', { name: 'A little human attention.' }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('customer-mobile.png'),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Support desk', exact: true }).click();
  await page.getByLabel('Support access key').fill('demo-support-key');
  await page.getByRole('button', { name: 'Open support desk' }).click();
  await page
    .getByRole('row')
    .filter({ hasText: 'ORD-1010' })
    .getByRole('button', { name: /Open/ })
    .click();
  await expect(page.locator('blockquote')).toContainText('<img src=x');
  expect(await page.evaluate(() => 'hacked' in window)).toBe(false);
  await page.screenshot({
    path: testInfo.outputPath('support-mobile.png'),
    fullPage: true,
  });
  const overflow = await page.evaluate(() => ({
    width: innerWidth,
    document: document.documentElement.scrollWidth,
    elements: [...document.querySelectorAll('main *')]
      .filter((element) => element.getBoundingClientRect().right > innerWidth)
      .map((element) => ({
        tag: element.tagName,
        className: element.className,
        right: element.getBoundingClientRect().right,
      }))
      .slice(-20),
  }));
  expect(overflow.document, JSON.stringify(overflow)).toBeLessThanOrEqual(
    overflow.width,
  );
});
