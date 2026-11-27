import { ButtonLink } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" />
      <EmptyState
        title="We could not find that page"
        description="The link may be out of date, or the page may have moved."
        action={<ButtonLink to="/transactions">Go to my transactions</ButtonLink>}
      />
    </>
  );
}
