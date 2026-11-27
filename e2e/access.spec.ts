import { expect, test } from '@playwright/test';
import { agent, customer } from './support/env';
import { mainNavigation, openDirectly, signIn } from './support/session';

test('an agent has no customer navigation and no customer pages', async ({ page }) => {
  await signIn(page, agent);
  await expect(page.getByRole('heading', { name: 'Dispute queue', level: 1 })).toBeVisible();
  await expect(mainNavigation(page).getByRole('link')).toHaveText(['Dispute queue']);

  await openDirectly(page, '/transactions');
  await expect(page.getByRole('heading', { name: 'Page not found', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Go to the dispute queue' })).toBeVisible();
});

test('a customer has no agent navigation and cannot reach the agent area', async ({ page }) => {
  await signIn(page, customer);
  await expect(page.getByRole('heading', { name: 'Transactions', level: 1 })).toBeVisible();
  await expect(mainNavigation(page).getByRole('link')).toHaveText([
    'Transactions',
    'Disputes',
    'Mandates',
    /^Inbox/,
  ]);

  await openDirectly(page, '/agent');
  await expect(page.getByRole('heading', { name: 'Page not found', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Go to my transactions' })).toBeVisible();
});
