import { expect, test } from '@playwright/test';
import { approveDispute, openDisputeFromQueue } from './support/agent';
import {
  openDisputableDebitOrder,
  progressSteps,
  raiseDispute,
  uniqueText,
} from './support/customer';
import { agent, customer } from './support/env';
import { mainNavigation, signIn } from './support/session';

test('a debit order dispute is approved by an agent and refunded', async ({ page, browser }) => {
  const comment = uniqueText('This is not the amount I agreed to');

  const reference = await test.step('the customer raises the dispute', async () => {
    await signIn(page, customer);
    await openDisputableDebitOrder(page, 'Registered Mandate');
    const raised = await raiseDispute(page, 'The amount is not what I agreed to', comment);

    await expect(progressSteps(page)).toHaveText([/Submitted/]);
    await expect(page.getByText('Your dispute is waiting for review by ACME Bank.')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Comments' })).toContainText(comment);
    return raised;
  });

  await test.step('an agent finds it in the queue and approves it', async () => {
    // A second person on another device: a browser context of their own, with its own session.
    const agentContext = await browser.newContext();
    const agentPage = await agentContext.newPage();
    await signIn(agentPage, agent);
    await openDisputeFromQueue(agentPage, reference);
    await expect(agentPage.getByRole('list', { name: 'Comments' })).toContainText(comment);
    await approveDispute(agentPage);
    await agentContext.close();
  });

  await test.step('the customer sees it processed and then refunded', async () => {
    // The customer's page is still open and re-reads the dispute on its own.
    await expect(progressSteps(page)).toHaveText([/Submitted/, /Processing/]);
    // The simulated scheme answers 20 to 30 seconds after the approval.
    await expect(progressSteps(page)).toHaveText([/Submitted/, /Processing/, /Refunded/], {
      timeout: 60_000,
    });
    await expect(page.getByText('Your dispute was successful')).toBeVisible();
  });

  await test.step('the inbox has a notification for each step', async () => {
    const mine = page
      .getByRole('list', { name: 'Notifications' })
      .getByRole('listitem')
      .filter({ hasText: reference });
    const outcome = mine.getByRole('button', { name: /Your dispute was successful/ });

    // Notifications are delivered a moment after the status changes and the inbox does not
    // refresh itself, so come back to it until the last one is there.
    await expect(async () => {
      await mainNavigation(page).getByRole('link', { name: 'Disputes' }).click();
      await mainNavigation(page)
        .getByRole('link', { name: /^Inbox/ })
        .click();
      await expect(outcome).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 30_000 });
    await expect(mine.getByRole('button', { name: /Your dispute is in progress/ })).toBeVisible();
    await expect(mine.getByRole('button', { name: /We received your dispute/ })).toBeVisible();

    await outcome.click();
    await expect(mine.getByText(`Dispute ${reference} is successful.`)).toBeVisible();
  });
});
