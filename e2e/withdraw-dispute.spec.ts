import { expect, test } from '@playwright/test';
import {
  openDisputableDebitOrder,
  progressSteps,
  raiseDispute,
  uniqueText,
} from './support/customer';
import { customer } from './support/env';
import { signIn } from './support/session';

test('a customer withdraws a dispute and can dispute the transaction again', async ({ page }) => {
  await signIn(page, customer);
  await openDisputableDebitOrder(page, 'EFT');
  await raiseDispute(page, 'I cancelled this agreement', uniqueText('Raised to be withdrawn'));
  await expect(progressSteps(page)).toHaveText([/Submitted/]);

  await test.step('withdraw with the in-page confirmation', async () => {
    await page.getByRole('button', { name: 'Withdraw dispute', exact: true }).click();
    await page
      .getByRole('group', { name: 'Withdraw this dispute?' })
      .getByRole('button', { name: 'Yes, withdraw dispute' })
      .click();

    await expect(page.getByText('Your dispute was withdrawn.')).toBeVisible();
    await expect(progressSteps(page)).toHaveText([/Submitted/, /Withdrawn/]);
    await expect(page.getByRole('button', { name: 'Withdraw dispute' })).toBeHidden();
  });

  await test.step('the transaction can be disputed again', async () => {
    await page.getByRole('region', { name: 'Dispute details' }).getByRole('link').click();
    await page.getByRole('link', { name: 'Dispute', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tell us why' })).toBeVisible();
  });
});
