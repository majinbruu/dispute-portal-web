import { expect, type Locator, type Page } from '@playwright/test';
import { mainNavigation } from './session';

export type DebitOrderType = 'DebiCheck' | 'Registered Mandate' | 'EFT';

/**
 * Opens the first transaction in the list that can be disputed right now, paging forward until
 * one is found. Choosing by what the list offers, not by a fixed transaction, is what lets the
 * journeys run again on a stack that already holds the disputes of earlier runs.
 */
async function openFirstDisputable(page: Page, listName: string): Promise<void> {
  const list = page.getByRole('list', { name: listName });
  // Only a transaction that can be disputed has a "Dispute" action next to its row.
  const disputable = list
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: /^Dispute / }) });
  const next = page
    .getByRole('navigation', { name: `${listName} pages` })
    .getByRole('button', { name: 'Next' });

  for (;;) {
    await expect(list).toBeVisible();
    // While a filter or page change loads, the previous rows stay on screen marked as busy.
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    if ((await disputable.count()) > 0) break;
    if (!(await next.isVisible()) || (await next.isDisabled())) {
      throw new Error(
        `No transaction under "${listName}" can be disputed any more: earlier runs have used ` +
          'up the seeded ones. Recreate the stack with its data volume to start again.',
      );
    }
    await next.click();
  }

  // The row's first link goes to the transaction; the "Dispute" action comes after it.
  await disputable.first().getByRole('link').first().click();
  await expect(page.getByRole('link', { name: 'Dispute', exact: true })).toBeVisible();
}

export async function openDisputableDebitOrder(page: Page, type: DebitOrderType): Promise<void> {
  await mainNavigation(page).getByRole('link', { name: 'Transactions' }).click();
  await page.getByLabel('Mandate type').selectOption({ label: type });
  await openFirstDisputable(page, 'Debit orders');
}

export async function openDisputableCardPurchase(page: Page): Promise<void> {
  await mainNavigation(page).getByRole('link', { name: 'Transactions' }).click();
  await page.getByRole('tab', { name: 'Card' }).click();
  await openFirstDisputable(page, 'Card transactions');
}

/**
 * From a transaction's page, raises a dispute through the two-step form and lands on the
 * dispute's page. Returns the dispute reference shown there.
 */
export async function raiseDispute(page: Page, reason: string, comment: string): Promise<string> {
  await page.getByRole('link', { name: 'Dispute', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Tell us why' })).toBeVisible();
  await page.getByRole('radio', { name: reason }).check();
  await page.getByLabel('Comment (optional)').fill(comment);
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'Review your dispute' })).toBeVisible();
  await expect(page.getByText(reason)).toBeVisible();
  await expect(page.getByText(comment)).toBeVisible();
  await page.getByRole('button', { name: 'Submit dispute' }).click();

  await expect(page.getByRole('heading', { name: 'Dispute progress', level: 1 })).toBeVisible();
  const reference = await page.getByText(/^Reference DSP-/).innerText();
  return reference.replace('Reference ', '');
}

/** The steps of the dispute's timeline, oldest first. */
export function progressSteps(page: Page): Locator {
  return page.getByRole('list', { name: 'Dispute progress' }).getByRole('listitem');
}

/** Text that no earlier run has used, so a match can only be this run's. */
export function uniqueText(prefix: string): string {
  return `${prefix} (end-to-end test, ${new Date().toISOString()})`;
}
