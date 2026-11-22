import { render, screen, within } from '@testing-library/react';
import { renderApp } from '../test/renderApp';
import { ConfigError } from '../lib/config';
import { ErrorBoundary } from './ErrorBoundary';
import { routes } from './router';

const signOut = vi.fn();

vi.mock('../auth/useSession', () => ({
  useSession: () => ({ displayName: 'Thandi Mokoena', signOut }),
}));

describe('AppLayout', () => {
  it('shows the brand, navigation, signed-in customer and sign out', async () => {
    const { user } = renderApp({
      routes,
      at: '/nowhere',
      api: { 'GET /api/v1/notifications/unread-count': { unread: 0 } },
    });

    expect(screen.getByRole('link', { name: 'ACME Bank' })).toHaveAttribute('href', '/');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    for (const name of ['Debit orders', 'Disputes', 'Mandates', 'Inbox']) {
      expect(within(nav).getByRole('link', { name })).toBeInTheDocument();
    }
    expect(screen.getByText('Thandi Mokoena')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('shows the unread count on the inbox link', async () => {
    renderApp({
      routes,
      at: '/nowhere',
      api: { 'GET /api/v1/notifications/unread-count': { unread: 3 } },
    });

    expect(await screen.findByRole('link', { name: 'Inbox, 3 unread' })).toHaveTextContent('3');
  });

  it('caps a large unread count', async () => {
    renderApp({
      routes,
      at: '/nowhere',
      api: { 'GET /api/v1/notifications/unread-count': { unread: '250' } },
    });

    expect(await screen.findByRole('link', { name: 'Inbox, 250 unread' })).toHaveTextContent('99+');
  });

  it('has a skip link to the main content', () => {
    renderApp({ routes, at: '/nowhere' });

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main',
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });
});

describe('routing', () => {
  it('shows a not-found page for unknown routes', () => {
    renderApp({ routes, at: '/does-not-exist' });

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to my debit orders' })).toHaveAttribute(
      'href',
      '/debit-orders',
    );
  });
});

describe('ErrorBoundary', () => {
  function Boom({ error }: { error: Error }): never {
    throw error;
  }

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('renders its children when nothing fails', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('replaces a crashed tree with a recoverable message', () => {
    render(
      <ErrorBoundary>
        <Boom error={new Error('kaboom')} />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.queryByText('kaboom')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });

  it('explains a configuration failure without technical detail', () => {
    render(
      <ErrorBoundary>
        <Boom error={new ConfigError('oidcAuthority must be an http(s) URL')} />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('ACME Bank is not available');
    expect(screen.queryByText(/oidcAuthority/)).not.toBeInTheDocument();
  });
});
