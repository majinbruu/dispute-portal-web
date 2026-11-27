import { expect, test } from '@playwright/test';
import { openDisputeFromQueue, rejectDispute } from './support/agent';
import {
  openDisputableCardPurchase,
  progressSteps,
  raiseDispute,
  uniqueText,
} from './support/customer';
import { agent, customer } from './support/env';
import { signIn } from './support/session';

test('a card purchase dispute is rejected by an agent with a reason', async ({ page, browser }) => {
  const rejection = uniqueText('The statement shows two separate purchases');

  const reference = await test.step('the customer disputes a card purchase', async () => {
    await signIn(page, customer);
    await openDisputableCardPurchase(page);
    const raised = await raiseDispute(
      page,
      'I was charged twice',
      uniqueText('I only bought this once'),
    );
    await expect(progressSteps(page)).toHaveText([/Submitted/]);
    return raised;
  });

  await test.step('an agent rejects it with a reason', async () => {
    const agentContext = await browser.newContext();
    const agentPage = await agentContext.newPage();
    await signIn(agentPage, agent);
    await openDisputeFromQueue(agentPage, reference);
    await rejectDispute(agentPage, rejection);
    await agentContext.close();
  });

  await test.step('the customer sees it declined with that reason', async () => {
    // The customer's page is still open and re-reads the dispute on its own.
    await expect(progressSteps(page)).toHaveText([/Submitted/, /Declined/]);
    await expect(page.getByText('Your dispute was declined.')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Dispute details' })).toContainText(rejection);
    // A decided dispute can no longer be withdrawn.
    await expect(page.getByRole('button', { name: 'Withdraw dispute' })).toBeHidden();
  });
});
