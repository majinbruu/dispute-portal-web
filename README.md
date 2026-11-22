# ACME Bank dispute portal (web)

The customer-facing front end of the ACME Bank debit order dispute portal. Customers sign in,
review their debit orders and mandates, dispute a debit order, follow the dispute's progress and
read notifications about it. ACME Bank is fictional.

It is a React single-page app (TypeScript, Vite, TanStack Query, React Router) that talks to the
Dispute Portal API and signs in through Keycloak using OpenID Connect (authorization code with
PKCE). The API lives in a separate repository, `dispute-portal-api`; see that repository for
running the full stack (API, database, Keycloak) and for the demo users.

## Prerequisites

- Node.js 26 (see `.nvmrc`) and npm
- Docker, to build and run the container image
- For anything beyond the sign-in screen: the API on `http://localhost:5080` and Keycloak on
  `http://localhost:8080` (realm `acme-bank`, public client `dispute-portal-web`)

## Run locally

```sh
npm ci
npm run dev        # http://localhost:3000, proxies /api to http://localhost:5080
```

Runtime settings come from `/config.js`, loaded before the app. In development that is
`public/config.js`; in the container nginx generates it from environment variables, so one image
runs in every environment.

## Scripts

| Script                            | What it does                                                     |
| --------------------------------- | ---------------------------------------------------------------- |
| `npm run dev`                     | Vite dev server on port 3000                                     |
| `npm run build`                   | Typecheck and build to `dist/`                                   |
| `npm run preview`                 | Serve the production build locally                               |
| `npm test`                        | Unit tests (Vitest, React Testing Library)                       |
| `npm run test:coverage`           | Tests with coverage thresholds on `src/lib` and `src/components` |
| `npm run lint`                    | ESLint                                                           |
| `npm run format` / `format:check` | Prettier                                                         |
| `npm run typecheck`               | TypeScript only                                                  |
| `npm run generate:api`            | Regenerate `src/api/schema.d.ts` from `api/openapi.json`         |
| `npm run check:api`               | Fail if the committed API types differ from the OpenAPI document |

`api/openapi.json` is a copy of the API's contract. When the API changes, copy the new document
in and run `npm run generate:api`.

## Run with Docker

```sh
docker build -t dispute-portal-web:local .

docker run --rm -p 3000:8080 \
  -e OIDC_AUTHORITY=http://localhost:8080/realms/acme-bank \
  -e OIDC_ORIGIN=http://localhost:8080 \
  -e OIDC_CLIENT_ID=dispute-portal-web \
  -e API_UPSTREAM=http://api:8080 \
  dispute-portal-web:local
```

| Variable         | Purpose                                                       |
| ---------------- | ------------------------------------------------------------- |
| `OIDC_AUTHORITY` | Issuer URL of the Keycloak realm, as the browser reaches it   |
| `OIDC_ORIGIN`    | Origin of that issuer, allowed by the Content-Security-Policy |
| `OIDC_CLIENT_ID` | Public OIDC client ID                                         |
| `API_UPSTREAM`   | API base URL as nginx reaches it, without a trailing slash    |

All four are required; nginx will not start without them. The container runs unprivileged nginx
on port 8080, serves the app, proxies `/api/` to the API and answers `/healthz`. The app must be
reached at an origin registered as a redirect URI on the Keycloak client
(`http://localhost:3000/` in the demo realm).

## Project layout

```
api/                 OpenAPI contract the types are generated from
nginx/               nginx templates (SPA, /config.js, /api proxy, security headers)
src/app/             providers, router, layout, error boundary
src/auth/            OIDC sign-in and session
src/api/             generated schema, typed client, query hooks
src/features/        debit-orders, disputes, mandates, inbox
src/components/      shared UI components
src/lib/             config, formatting, problem-details parsing
src/styles/          design tokens and global styles
```
