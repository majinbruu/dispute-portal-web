import { expect, type Page } from '@playwright/test';

/** Finds a dispute that waits for review in the agent's queue, by its reference, and opens it. */
export async function openDisputeFromQueue(page: Page, reference: string): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Dispute queue', level: 1 })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Dispute reference' }).fill(reference);
  await page.getByRole('button', { name: 'Search' }).click();

  const row = page.getByRole('list', { name: 'Disputes' }).getByRole('link', { name: reference });
  await expect(row).toContainText('Submitted');
  await row.click();
  await expect(page.getByRole('heading', { name: reference, level: 1 })).toBeVisible();
}

export async function approveDispute(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await page
    .getByRole('group', { name: 'Approve this dispute?' })
    .getByRole('button', { name: 'Yes, approve dispute' })
    .click();
  await expect(page.getByText('Dispute approved. It has been sent for processing.')).toBeVisible();
}

export async function rejectDispute(page: Page, reason: string): Promise<void> {
  await page.getByRole('button', { name: 'Reject', exact: true }).click();
  const confirmation = page.getByRole('group', { name: 'Reject this dispute?' });
  await confirmation.getByLabel('Reason for rejecting').fill(reason);
  await confirmation.getByRole('button', { name: 'Reject dispute' }).click();
  await expect(
    page.getByText('Dispute rejected. The customer will see your reason as the outcome.'),
  ).toBeVisible();
}
