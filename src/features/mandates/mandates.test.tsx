import { screen, waitFor, within } from '@testing-library/react';
import { paged, problemResponse, requestsTo } from '../../test/apiMock';
import { mandate, MANDATE_ID } from '../../test/fixtures';
import { renderApp } from '../../test/renderApp';
import { mandateRoutes } from './routes';

const LIST = 'GET /api/v1/mandates';
const DETAIL = `GET /api/v1/mandates/${MANDATE_ID}`;

describe('mandates home', () => {
  it('offers DebiCheck and registered mandates', () => {
    renderApp({ routes: mandateRoutes, at: '/mandates' });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Debit order mandates' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /DebiCheck mandates/ })).toHaveAttribute(
      'href',
      '/mandates/debicheck',
    );
    expect(screen.getByRole('link', { name: /Registered mandates/ })).toHaveAttribute(
      'href',
      '/mandates/registered',
    );
  });
});

describe('mandate lists', () => {
  it('lists DebiCheck mandates and asks the API for that type', async () => {
    const { fetchMock } = renderApp({
      routes: mandateRoutes,
      at: '/mandates/debicheck',
      api: { [LIST]: paged([mandate()]) },
    });

    const list = await screen.findByRole('list', { name: 'DebiCheck mandates' });
    const row = within(list).getByRole('link');
    expect(row).toHaveAttribute('href', `/mandates/${MANDATE_ID}`);
    expect(row).toHaveTextContent('FitLife Gym');
    expect(row).toHaveTextContent('Reference MND-0001');
    expect(row).toHaveTextContent(/R\s499,00/);
    expect(row).toHaveTextContent('Monthly');
    expect(row).toHaveTextContent('Active');

    const url = new URL(requestsTo(fetchMock, 'GET', '/api/v1/mandates')[0]!.url);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      Type: 'DebiCheck',
      Page: '1',
      PageSize: '10',
    });
  });

  it('shows the DebiCheck empty state', async () => {
    renderApp({ routes: mandateRoutes, at: '/mandates/debicheck', api: { [LIST]: paged([]) } });

    expect(
      await screen.findByText('You have no DebiCheck mandates available to display'),
    ).toBeInTheDocument();
  });

  it('shows the registered empty state and asks for registered mandates', async () => {
    const { fetchMock } = renderApp({
      routes: mandateRoutes,
      at: '/mandates/registered',
      api: { [LIST]: paged([]) },
    });

    expect(await screen.findByText('No mandates to display')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Registered mandates' }),
    ).toBeInTheDocument();
    expect(requestsTo(fetchMock, 'GET', '/api/v1/mandates')[0]!.url).toContain('Type=Registered');
  });

  it('pages through mandates', async () => {
    const { user, fetchMock } = renderApp({
      routes: mandateRoutes,
      at: '/mandates/registered',
      api: { [LIST]: paged([mandate({ type: 'Registered' })], { totalItems: 12, totalPages: 2 }) },
    });
    await screen.findByRole('list', { name: 'Registered mandates' });

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(requestsTo(fetchMock, 'GET', '/api/v1/mandates').at(-1)!.url).toContain('Page=2');
    });
  });

  it('shows the API problem with its trace ID', async () => {
    renderApp({
      routes: mandateRoutes,
      at: '/mandates/debicheck',
      api: { [LIST]: () => problemResponse(403, 'forbidden', 'You cannot view mandates.') },
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('You cannot view mandates.');
    expect(alert).toHaveTextContent('trace-forbidden');
  });
});

describe('mandate detail', () => {
  it('shows amounts, frequency, collection day, date adjustment and authentication', async () => {
    renderApp({
      routes: mandateRoutes,
      at: `/mandates/${MANDATE_ID}`,
      api: { [DETAIL]: mandate() },
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'FitLife Gym' })).toBeVisible();

    const collection = screen.getByRole('region', { name: 'Collection' });
    expect(collection).toHaveTextContent(/Instalment amountR\s499,00/);
    expect(collection).toHaveTextContent(/Maximum collection amountR\s748,50/);
    expect(collection).toHaveTextContent('FrequencyMonthly');
    expect(collection).toHaveTextContent('Collection day1st of each month');
    expect(collection).toHaveTextContent('First collection date01 Jun 2025');
    expect(collection).toHaveTextContent('Date adjustment allowedYes');
    expect(collection).toHaveTextContent('Tracking enabledYes');

    const authentication = screen.getByRole('region', { name: 'Authentication' });
    expect(authentication).toHaveTextContent('Authentication typeReal-time (TT1)');
    expect(authentication).toHaveTextContent(/Authenticated on\d{2} May 2025/);

    expect(screen.getByRole('link', { name: /DebiCheck mandates/ })).toHaveAttribute(
      'href',
      '/mandates/debicheck',
    );
  });

  it('omits authentication for registered mandates', async () => {
    renderApp({
      routes: mandateRoutes,
      at: `/mandates/${MANDATE_ID}`,
      api: {
        [DETAIL]: mandate({
          type: 'Registered',
          frequency: 'Weekly',
          collectionDay: '5',
          dateAdjustmentAllowed: false,
          authenticationType: null,
          authenticatedAt: null,
        }),
      },
    });

    const collection = await screen.findByRole('region', { name: 'Collection' });
    expect(collection).toHaveTextContent('Collection dayDay 5');
    expect(collection).toHaveTextContent('Date adjustment allowedNo');
    expect(screen.queryByRole('region', { name: 'Authentication' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Registered mandates/ })).toHaveAttribute(
      'href',
      '/mandates/registered',
    );
  });

  it('shows a not-found problem', async () => {
    renderApp({
      routes: mandateRoutes,
      at: `/mandates/${MANDATE_ID}`,
      api: { [DETAIL]: () => problemResponse(404, 'not_found', 'Mandate not found.') },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Mandate not found.');
  });
});
