import { ButtonLink } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

/** Where a user is sent when a page cannot be shown: the first screen of their side of the portal. */
export interface HomeLink {
  to: string;
  label: string;
}

/**
 * Also what a user sees for a page that belongs to the other role: those routes are not in their
 * route table at all, so to them the page does not exist.
 */
export function NotFoundPage({ home }: { home: HomeLink }) {
  return (
    <>
      <PageHeader title="Page not found" />
      <EmptyState
        title="We could not find that page"
        description="The link may be out of date, or the page may have moved."
        action={<ButtonLink to={home.to}>{home.label}</ButtonLink>}
      />
    </>
  );
}
