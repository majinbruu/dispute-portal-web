import { normalizePaged } from './paging';

describe('normalizePaged', () => {
  it('passes numeric paging through', () => {
    expect(
      normalizePaged({ items: ['a', 'b'], page: 2, pageSize: 2, totalItems: 5, totalPages: 3 }),
    ).toEqual({ items: ['a', 'b'], page: 2, pageSize: 2, totalItems: 5, totalPages: 3 });
  });

  it('accepts integers serialised as strings', () => {
    expect(
      normalizePaged({ items: [], page: '1', pageSize: '10', totalItems: '0', totalPages: '0' }),
    ).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  });

  it('derives totalPages when the API omits it', () => {
    expect(normalizePaged({ items: [1], page: 1, pageSize: 10, totalItems: 21 }).totalPages).toBe(
      3,
    );
  });

  it('falls back to safe values for malformed numbers', () => {
    expect(normalizePaged({ items: [1, 2], page: 'x', pageSize: 0, totalItems: 'y' })).toEqual({
      items: [1, 2],
      page: 1,
      pageSize: 1,
      totalItems: 2,
      totalPages: 2,
    });
  });
});
