import { screen, waitFor, within } from '@testing-library/react';
import { jsonResponse, paged, problemResponse, requestsTo } from '../../test/apiMock';
import { DISPUTE_ID, notification, NOTIFICATION_ID } from '../../test/fixtures';
import { renderApp } from '../../test/renderApp';
import { inboxRoutes } from './routes';

const LIST = 'GET /api/v1/notifications';
const COUNT = 'GET /api/v1/notifications/unread-count';
const READ = `POST /api/v1/notifications/${NOTIFICATION_ID}/read`;

const older = notification({
  id: 'older',
  category: 'DisputeRefunded',
  title: 'Your dispute was refunded',
  body: 'R 250,00 was paid back into your account.',
  relatedDisputeId: null,
  createdAt: '2026-02-01T10:00:00Z',
  isRead: true,
});

describe('inbox', () => {
  it('lists notifications in the order the API returns them, marking unread ones', async () => {
    renderApp({
      routes: inboxRoutes,
      at: '/inbox',
      api: { [LIST]: paged([notification(), older]), [COUNT]: { unread: 1 } },
    });

    const list = await screen.findByRole('list', { name: 'Notifications' });
    const [first, second] = within(list).getAllByRole('listitem');

    expect(within(first!).getByRole('button')).toHaveTextContent(
      'Unread: We received your dispute',
    );
    expect(within(second!).getByRole('button')).toHaveTextContent('Your dispute was refunded');
    expect(within(second!).getByRole('button')).not.toHaveTextContent('Unread');
    expect(await screen.findByText('1 unread')).toBeInTheDocument();
  });

  it('opens a message, marks it as read and links to the dispute', async () => {
    let read = false;
    const { user, fetchMock } = renderApp({
      routes: inboxRoutes,
      at: '/inbox',
      api: {
        [LIST]: () => jsonResponse(paged([notification({ isRead: read })])),
        [COUNT]: () => jsonResponse({ unread: read ? 0 : 1 }),
        [READ]: () => {
          read = true;
          return jsonResponse(notification({ isRead: true }));
        },
      },
    });

    const toggle = await screen.findByRole('button', { name: /We received your dispute/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByText('Your dispute DSP-2026-000123 against FitLife Gym has been received.'),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'View dispute' })).toHaveAttribute(
      'href',
      `/disputes/${DISPUTE_ID}`,
    );
    await waitFor(() => {
      expect(
        requestsTo(fetchMock, 'POST', `/api/v1/notifications/${NOTIFICATION_ID}/read`),
      ).toHaveLength(1);
    });

    // The list and the unread count are re-read once the message is marked as read.
    expect(await screen.findByText('No unread messages')).toBeInTheDocument();
    await waitFor(() => {
      expect(toggle).not.toHaveTextContent('Unread');
    });

    await user.click(toggle);
    await user.click(toggle);
    expect(
      requestsTo(fetchMock, 'POST', `/api/v1/notifications/${NOTIFICATION_ID}/read`),
    ).toHaveLength(1);
  });

  it('does not call the API when opening a message that is already read', async () => {
    const { user, fetchMock } = renderApp({
      routes: inboxRoutes,
      at: '/inbox',
      api: { [LIST]: paged([older]), [COUNT]: { unread: 0 } },
    });

    await user.click(await screen.findByRole('button', { name: /Your dispute was refunded/ }));

    expect(screen.getByText('R 250,00 was paid back into your account.')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'View dispute' })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([input]) => (input as Request).method === 'POST')).toBe(
      false,
    );
  });

  it('reports a failure to mark a message as read', async () => {
    const { user } = renderApp({
      routes: inboxRoutes,
      at: '/inbox',
      api: {
        [LIST]: paged([notification()]),
        [COUNT]: { unread: 1 },
        [READ]: () => problemResponse(500, 'internal_error', 'Please try again later.'),
      },
    });

    await user.click(await screen.findByRole('button', { name: /We received your dispute/ }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not mark that message as read');
    expect(alert).toHaveTextContent('trace-internal_error');
  });

  it('shows the empty state', async () => {
    renderApp({
      routes: inboxRoutes,
      at: '/inbox',
      api: { [LIST]: paged([]), [COUNT]: { unread: 0 } },
    });

    expect(await screen.findByText('Your inbox is empty')).toBeInTheDocument();
  });

  it('shows the API problem with its trace ID', async () => {
    renderApp({
      routes: inboxRoutes,
      at: '/inbox',
      api: { [LIST]: () => problemResponse(429, 'rate_limited', 'Slow down.') },
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not load your inbox');
    expect(alert).toHaveTextContent('Slow down.');
    expect(alert).toHaveTextContent('trace-rate_limited');
  });

  it('pages through notifications', async () => {
    const { user, fetchMock } = renderApp({
      routes: inboxRoutes,
      at: '/inbox',
      api: {
        [LIST]: paged([notification()], { totalItems: 30, totalPages: 3 }),
        [COUNT]: { unread: 1 },
      },
    });
    await screen.findByRole('list', { name: 'Notifications' });

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(requestsTo(fetchMock, 'GET', '/api/v1/notifications').at(-1)!.url).toContain('page=2');
    });
  });
});
