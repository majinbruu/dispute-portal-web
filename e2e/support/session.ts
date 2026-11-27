import { expect, type Locator, type Page } from '@playwright/test';
import type { PortalUser } from './env';

/** Signs in the way a user does: the portal's sign-in screen, then the identity provider's page. */
export async function signIn(page: Page, user: PortalUser): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill(user.username);
  await page.getByRole('textbox', { name: 'Password' }).fill(user.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}

/**
 * Opens a URL directly, as from a bookmark or a typed address. The portal keeps tokens in memory
 * only, so a full page load shows the sign-in screen again; the identity provider then answers
 * from its own session without asking for the password.
 */
export async function openDirectly(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}

/** The main navigation, which differs by role. */
export function mainNavigation(page: Page): Locator {
  return page.getByRole('navigation', { name: 'Main' });
}
