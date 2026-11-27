import { useRouteError } from 'react-router';
import { ButtonLink } from '../components/Button';
import { ErrorState } from '../components/ErrorState';
import { toProblem } from '../lib/problem';
import type { HomeLink } from './NotFoundPage';

/** Shown inside the layout when a screen throws while rendering, so navigation keeps working. */
export function RouteError({ home }: { home: HomeLink }) {
  const error = useRouteError();
  console.error('Route failed to render', error);
  return (
    <ErrorState
      problem={toProblem(error)}
      title="This page could not be displayed"
      action={<ButtonLink to={home.to}>{home.label}</ButtonLink>}
    />
  );
}
