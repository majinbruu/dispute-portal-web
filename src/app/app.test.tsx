import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PortalRole } from '../auth/roles';
import { ConfigError, resetAppConfigCache } from '../lib/config';
import { createFetchMock, paged, requestsTo } from '../test/apiMock';
import { agentDisputeSummary, DISPUTE_ID } from '../test/fixtures';
import { renderApp } from '../test/renderApp';
import { AuthenticatedApp } from './AuthenticatedApp';
import { ErrorBoundary } from './ErrorBoundary';
import { agentPortalRoutes, customerRoutes } from './router';

const signOut = vi.fn();
const session = vi.hoisted((): { role: PortalRole | undefined; displayName: string } => ({
  role: 'customer',
  displayName: 'Thandi Mokoena',
}));

vi.mock('../auth/useSession', () => ({
  useSession: () => ({ displayName: session.displayName, role: session.role, signOut }),
}));

const UNREAD = 'GET /api/v1/notifications/unread-count';
const QUEUE = 'GET /api/v1/agent/disputes';

function paths(fetchMock: ReturnType<typeof createFetchMock>): string[] {
  return fetchMock.mock.calls.map(([input]) => new URL((input as Request).url).pathname);
}

afterEach(() => {
  session.role = 'customer';
  session.displayName = 'Thandi Mokoena';
  signOut.mockClear();
});

describe('AppLayout', () => {
  it('shows the brand, navigation, signed-in customer and sign out', async () => {
    const { user } = renderApp({
      routes: customerRoutes,
      at: '/nowhere',
      api: { [UNREAD]: { unread: 0 } },
    });

    expect(screen.getByRole('link', { name: 'ACME Bank' })).toHaveAttribute('href', '/');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Transactions', 'Disputes', 'Mandates', 'Inbox']);
    expect(screen.getByText('Thandi Mokoena')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('shows the unread count on the inbox link', async () => {
    renderApp({
      routes: customerRoutes,
      at: '/nowhere',
      api: { [UNREAD]: { unread: 3 } },
    });

    expect(await screen.findByRole('link', { name: 'Inbox, 3 unread' })).toHaveTextContent('3');
  });

  it('caps a large unread count', async () => {
    renderApp({
      routes: customerRoutes,
      at: '/nowhere',
      api: { [UNREAD]: { unread: '250' } },
    });

    expect(await screen.findByRole('link', { name: 'Inbox, 250 unread' })).toHaveTextContent('99+');
  });

  it('has a skip link to the main content', () => {
    renderApp({ routes: customerRoutes, at: '/nowhere' });

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main',
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });
});

describe('routing', () => {
  it('moves focus to the main content after a client-side navigation', async () => {
    const { user } = renderApp({ routes: customerRoutes, at: '/nowhere' });
    expect(screen.getByRole('main')).not.toHaveFocus();

    await user.click(screen.getByRole('link', { name: 'Mandates' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Debit order mandates' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('shows a not-found page for unknown routes', () => {
    renderApp({ routes: customerRoutes, at: '/does-not-exist' });

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to my transactions' })).toHaveAttribute(
      'href',
      '/transactions',
    );
  });
});

describe('the customer side of the portal', () => {
  it('opens on the transactions', async () => {
    const { router } = renderApp({ routes: customerRoutes, at: '/' });

    expect(await screen.findByRole('heading', { level: 1, name: 'Transactions' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/transactions');
  });

  it.each([['/agent'], [`/agent/disputes/${DISPUTE_ID}`]])(
    'has no agent page at %s and never asks the API for one',
    async (path) => {
      const { fetchMock } = renderApp({
        routes: customerRoutes,
        at: path,
        api: { [UNREAD]: { unread: 0 }, [QUEUE]: paged([agentDisputeSummary()]) },
      });

      expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
      expect(screen.getByRole('link', { name: 'Go to my transactions' })).toHaveAttribute(
        'href',
        '/transactions',
      );
      expect(screen.queryByText(/Dispute queue|DSP-2026/)).not.toBeInTheDocument();
      await waitFor(() => {
        expect(requestsTo(fetchMock, 'GET', '/api/v1/notifications/unread-count')).toHaveLength(1);
      });
      expect(paths(fetchMock).filter((path) => path.startsWith('/api/v1/agent'))).toEqual([]);
    },
  );
});

describe('the agent side of the portal', () => {
  beforeEach(() => {
    session.role = 'agent';
    session.displayName = 'Zanele Khumalo';
  });

  it('opens on the dispute queue, with only agent navigation and no inbox', async () => {
    const { router, fetchMock } = renderApp({
      routes: agentPortalRoutes,
      at: '/',
      api: { [QUEUE]: paged([agentDisputeSummary()]) },
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Dispute queue' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/agent');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Dispute queue']);
    expect(within(nav).getByRole('link', { name: 'Dispute queue' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByText('Zanele Khumalo')).toBeInTheDocument();

    await screen.findByRole('list', { name: 'Disputes' });
    // Every request an agent's screens make is to the agent API.
    expect(paths(fetchMock)).toEqual(['/api/v1/agent/disputes']);
  });

  it('keeps the queue marked as current on a dispute page', () => {
    renderApp({ routes: agentPortalRoutes, at: `/agent/disputes/${DISPUTE_ID}` });

    expect(screen.getByRole('link', { name: 'Dispute queue', current: 'page' })).toHaveAttribute(
      'href',
      '/agent',
    );
  });

  it.each([
    ['/transactions'],
    ['/transactions/abc'],
    ['/transactions/abc/dispute'],
    ['/disputes'],
    [`/disputes/${DISPUTE_ID}`],
    ['/mandates'],
    ['/inbox'],
  ])('has no customer page at %s and never asks the API for one', (path) => {
    const { fetchMock } = renderApp({ routes: agentPortalRoutes, at: path });

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Go to the dispute queue' })).toHaveAttribute(
      'href',
      '/agent',
    );
    expect(
      screen.queryByRole('link', { name: /Transactions|Disputes|Mandates|Inbox/ }),
    ).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('AuthenticatedApp', () => {
  let fetchMock: ReturnType<typeof createFetchMock>;

  beforeAll(() => {
    window.__APP_CONFIG__ = {
      oidcAuthority: 'http://localhost:8080/realms/acme-bank',
      oidcClientId: 'dispute-portal-web',
      apiBaseUrl: '',
    };
  });

  beforeEach(() => {
    fetchMock = createFetchMock({
      [UNREAD]: { unread: 0 },
      [QUEUE]: paged([agentDisputeSummary()]),
      'GET /api/v1/transactions': paged([]),
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  afterAll(() => {
    delete window.__APP_CONFIG__;
    resetAppConfigCache();
  });

  it('gives a customer the customer pages', async () => {
    session.role = 'customer';
    render(<AuthenticatedApp />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Transactions' })).toBeVisible();
    expect(window.location.pathname).toBe('/transactions');
    expect(screen.getByRole('link', { name: 'Inbox' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dispute queue' })).not.toBeInTheDocument();
  });

  it('gives an agent the agent pages', async () => {
    session.role = 'agent';
    render(<AuthenticatedApp />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Dispute queue' })).toBeVisible();
    expect(window.location.pathname).toBe('/agent');
    expect(await screen.findByRole('list', { name: 'Disputes' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Transactions|Inbox/ })).not.toBeInTheDocument();
    expect(paths(fetchMock).every((path) => path.startsWith('/api/v1/agent'))).toBe(true);
  });

  it('does not show an agent a customer page they were sent a link to', () => {
    session.role = 'agent';
    window.history.replaceState({}, '', `/disputes/${DISPUTE_ID}`);
    render(<AuthenticatedApp />);

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not show a customer the agent queue they typed the address of', async () => {
    session.role = 'customer';
    window.history.replaceState({}, '', '/agent');
    render(<AuthenticatedApp />);

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(paths(fetchMock).filter((path) => path.startsWith('/api/v1/agent'))).toEqual([]);
  });

  it('tells a signed-in user with neither role that they have no access, and lets them sign out', async () => {
    session.role = undefined;
    session.displayName = 'Sam Visitor';
    window.history.replaceState({}, '', '/agent');
    render(<AuthenticatedApp />);

    expect(screen.getByRole('heading', { level: 1, name: 'You do not have access' })).toBeVisible();
    expect(screen.getByText(/You are signed in as Sam Visitor/)).toBeInTheDocument();
    expect(document.title).toBe('No access | ACME Bank');
    // No portal, so no navigation and no API calls.
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalledOnce();
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
