import { toNumber } from '../lib/format';
import type { Paged } from './types';

/** A page as the API serialises it: integers may arrive as numbers or numeric strings. */
export interface RawPaged<T> {
  items: T[];
  page: number | string;
  pageSize: number | string;
  totalItems: number | string;
  totalPages?: number | string;
}

function positiveInt(value: number | string | undefined, fallback: number): number {
  const number = toNumber(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

/** Normalises a page of results, deriving `totalPages` when the API leaves it out. */
export function normalizePaged<T>(raw: RawPaged<T>): Paged<T> {
  const pageSize = Math.max(1, positiveInt(raw.pageSize, raw.items.length));
  const totalItems = positiveInt(raw.totalItems, raw.items.length);
  return {
    items: raw.items,
    page: Math.max(1, positiveInt(raw.page, 1)),
    pageSize,
    totalItems,
    totalPages: positiveInt(raw.totalPages, Math.ceil(totalItems / pageSize)),
  };
}
