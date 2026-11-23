# ACME Bank Dispute Portal (web)

The customer-facing web app of a debit order dispute portal for the fictional ACME Bank. A customer signs in, sees the debit orders collected from their account, disputes the ones they are entitled to dispute, follows each dispute to its outcome, and reads notifications about it.

This repository holds the React front end. The API, the database, the identity provider and the Compose file that runs the whole system live in [dispute-portal-api](https://github.com/majinbruu/dispute-portal-api).

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Runbook: get it running](#runbook-get-it-running)
- [Develop, build and test](#develop-build-and-test)
- [How it works](#how-it-works)
- [Configuration](#configuration)
- [Project structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Known limitations](#known-limitations)

## What it does

| Screen                | Route                       | What the customer can do                                                                                                                                  |
| --------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign in               | `/` when signed out         | Sign in through Keycloak                                                                                                                                  |
| My debit orders       | `/debit-orders`             | See debit orders for one mandate type at a time (DebiCheck or Registered Mandate), filter by status, sort, page, and start a dispute where one is allowed |
| Debit order           | `/debit-orders/:id`         | See the details, the mandate, and either a **Dispute** button or the existing dispute                                                                     |
| Dispute a debit order | `/debit-orders/:id/dispute` | Choose a reason, review, and submit                                                                                                                       |
| Dispute history       | `/disputes`                 | See pending and completed disputes                                                                                                                        |
| Dispute progress      | `/disputes/:id`             | Follow a time-stamped timeline that updates on its own while the dispute is pending                                                                       |
| Mandates              | `/mandates`                 | Browse DebiCheck mandates and Registered mandates, and open one                                                                                           |
| Inbox                 | `/inbox`                    | Read notifications about disputes and mark them as read                                                                                                   |

A **Dispute** button appears only on debit orders the API reports as disputable. Dispute reasons show their ISO 20022 code in brackets, for example "The amount is not what I agreed to (AM09)".

## Tech stack

| Area               | Choice                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Language and build | TypeScript (strict), Vite                                                                                          |
| UI                 | React 19, React Router, CSS Modules with design tokens, no component framework                                     |
| Server state       | TanStack Query                                                                                                     |
| Forms              | React Hook Form with Zod                                                                                           |
| Sign-in            | OpenID Connect through Keycloak with `oidc-client-ts` and `react-oidc-context` (Authorization Code with PKCE)      |
| API client         | Types generated from the API's OpenAPI document with `openapi-typescript`, called with `openapi-fetch`             |
| Tests              | Vitest, React Testing Library, jsdom                                                                               |
| Quality            | ESLint, Prettier, type check                                                                                       |
| Packaging          | Multi-stage Dockerfile, unprivileged nginx                                                                         |
| CI                 | GitHub Actions: lint, format check, type check, tests with coverage thresholds, contract check, build, image build |

## Runbook: get it running

The web app needs the API and Keycloak to do anything beyond the sign-in screen. The simplest way to run it is the full stack from the API repository, which builds this repository's image too.

### 1. Install the prerequisites

**Windows** (PowerShell):

```powershell
winget install --id Git.Git --exact
winget install --id Docker.DockerDesktop --exact
```

**macOS** (Homebrew):

```sh
brew install git
brew install --cask docker
```

**Linux**: install Git from your package manager, then Docker Engine with the Compose plugin by following <https://docs.docker.com/engine/install/>.

Start Docker Desktop (Windows and macOS), wait until the engine is running, then check:

```sh
git --version
docker --version
docker compose version
```

### 2. Clone both repositories side by side

```sh
mkdir dispute-portal
cd dispute-portal
git clone https://github.com/majinbruu/dispute-portal-api.git
git clone https://github.com/majinbruu/dispute-portal-web.git
```

### 3. Start the full stack

```sh
cd dispute-portal-api
docker compose up --build -d
docker compose ps
```

Wait until all four services show `healthy`, then open <http://localhost:3000>.

### 4. Sign in

All three demo customers use the password `AcmeDemo!2026`.

| Username | What you will see                                            |
| -------- | ------------------------------------------------------------ |
| `thandi` | A full history of debit orders, disputes and notifications   |
| `sipho`  | A second customer, to see that data is isolated per customer |
| `lerato` | No data, to see the empty states                             |

The API repository's README has a guided walkthrough of the scenarios in the demo data.

### 5. Stop it

```sh
docker compose down
```

### Run only this image

To build and run the web container on its own, point it at an API and a Keycloak realm that are already running:

```sh
docker build -t dispute-portal-web:local .
```

Bash:

```sh
docker run --rm -p 3000:8080 \
  -e OIDC_AUTHORITY=http://localhost:8080/realms/acme-bank \
  -e OIDC_ORIGIN=http://localhost:8080 \
  -e OIDC_CLIENT_ID=dispute-portal-web \
  -e API_UPSTREAM=http://host.docker.internal:5080 \
  dispute-portal-web:local
```

PowerShell:

```powershell
docker run --rm -p 3000:8080 -e OIDC_AUTHORITY=http://localhost:8080/realms/acme-bank -e OIDC_ORIGIN=http://localhost:8080 -e OIDC_CLIENT_ID=dispute-portal-web -e API_UPSTREAM=http://host.docker.internal:5080 dispute-portal-web:local
```

`host.docker.internal` reaches the host machine from a container on Docker Desktop. On Linux, add `--add-host=host.docker.internal:host-gateway` to the command.

## Develop, build and test

To work on the code you need Node.js 26 (see `.nvmrc`).

**Windows:**

```powershell
winget install --id OpenJS.NodeJS.LTS --exact
```

**macOS:**

```sh
brew install node@26
```

**Any platform with nvm:**

```sh
nvm install
nvm use
```

### Run the dev server

Start the back end from the API repository first, without its web container:

```sh
cd ../dispute-portal-api
docker compose up --build -d postgres keycloak api
```

Then, in this repository:

```sh
npm ci
npm run dev
```

The dev server runs at <http://localhost:3000> and proxies `/api` to the API on `http://localhost:5080`. It must be port 3000, because that is the address the demo Keycloak realm allows.

### Checks

```sh
npm run lint
npm run format:check
npm run typecheck
npm test
npm run test:coverage
npm run build
```

| Script                  | What it does                                                                    |
| ----------------------- | ------------------------------------------------------------------------------- |
| `npm run dev`           | Vite dev server on port 3000                                                    |
| `npm run build`         | Type check and build to `dist/`                                                 |
| `npm run preview`       | Serve the production build locally                                              |
| `npm test`              | Unit tests                                                                      |
| `npm run test:coverage` | Tests with coverage thresholds (80% of lines) on `src/lib` and `src/components` |
| `npm run lint`          | ESLint                                                                          |
| `npm run format`        | Format with Prettier                                                            |
| `npm run format:check`  | Check formatting                                                                |
| `npm run typecheck`     | TypeScript only                                                                 |
| `npm run generate:api`  | Regenerate `src/api/schema.d.ts` from `api/openapi.json`                        |
| `npm run check:api`     | Fail if the committed API types differ from the OpenAPI document                |

### What the tests cover

Unit tests only: formatting of money and dates, problem-details parsing, configuration validation, the shared components, each screen against mocked API responses, and the dispute form flow, including the idempotency key and the message shown for each API error.

### When the API contract changes

`api/openapi.json` is a copy of the API's contract. Copy the new document from the API repository and regenerate the types:

```sh
cp ../dispute-portal-api/docs/api/openapi.json api/openapi.json
npm run generate:api
npm run typecheck
```

The type check then points at every place that needs to change.

## How it works

**Sign-in.** The app uses the Authorization Code flow with PKCE as a public client, so there is no client secret in the browser. Access tokens are kept in memory only, never in `localStorage`, which limits what a script injection could steal. The cost is that a page reload shows the sign-in screen again; one click signs back in through the Keycloak session. A 401 from the API ends the local session.

**Talking to the API.** Every call goes to `/api` on the same origin and carries the access token. nginx proxies `/api` to the API, so the browser needs no cross-origin setup. Errors from the API are RFC 9457 problem documents; the app shows their message and the trace ID.

**Raising a dispute safely.** The form creates one idempotency key per submission and reuses it on retry, so a double click or a retried request cannot create two disputes.

**Live progress.** The dispute progress page refetches every three seconds while the dispute is pending, and stops when it reaches an outcome.

**Security headers.** nginx sends a Content-Security-Policy that allows scripts and styles from the app's own origin only, and connections only to the app and the configured identity provider. It also sends `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy`. The container runs as a non-root user.

## Configuration

Settings are read at runtime, not baked in at build time, so one image runs in every environment. `index.html` loads `/config.js` before the app. In development that file is `public/config.js`. In the container nginx generates it from environment variables.

| Variable         | Purpose                                                       |
| ---------------- | ------------------------------------------------------------- |
| `OIDC_AUTHORITY` | Issuer URL of the Keycloak realm, as the browser reaches it   |
| `OIDC_ORIGIN`    | Origin of that issuer, allowed by the Content-Security-Policy |
| `OIDC_CLIENT_ID` | Public OIDC client ID                                         |
| `API_UPSTREAM`   | API base URL as nginx reaches it, without a trailing slash    |

All four are required; nginx will not start without them. The container listens on port 8080, serves the app, proxies `/api/` to the API and answers `/healthz`. It does not expose the API's health or metrics endpoints.

The app must be reached at an origin registered as a redirect URI on the Keycloak client. In the demo realm that is `http://localhost:3000/`.

## Project structure

```
api/                 OpenAPI contract the types are generated from
nginx/               nginx templates: app, /config.js, /api proxy, security headers
src/app/             providers, router, layout, error boundary
src/auth/            OIDC sign-in and session
src/api/             generated schema, typed client, query hooks
src/features/        debit-orders, disputes, mandates, inbox
src/components/      shared UI components
src/lib/             configuration, formatting, labels, problem-details parsing
src/styles/          design tokens and global styles
src/test/            test helpers and fixtures
```

## Troubleshooting

| Symptom                                              | Cause and fix                                                                                                        |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| The sign-in screen appears again after a page reload | Expected. Tokens are kept in memory only                                                                             |
| Keycloak shows "Invalid parameter: redirect_uri"     | The app is not at `http://localhost:3000`. Use that exact address, not `127.0.0.1` or another port                   |
| Every screen shows an error after sign-in            | The API is not reachable. Check `docker compose ps` in the API repository                                            |
| The web container exits at start                     | One of the four environment variables is missing, or the `API_UPSTREAM` host name does not resolve                   |
| `npm run dev` fails with "port 3000 is in use"       | The web container from the full stack is still running. Stop it with `docker compose stop web` in the API repository |

## Known limitations

- **Unit tests only.** There are no browser tests. The screens were checked by hand against the running API.
- **In-memory sessions.** A page reload needs one click to sign in again.
- **English only**, with South African formatting for money and dates.
- **No offline support**, and no automated accessibility audit. The app uses semantic HTML, labelled controls, visible focus and keyboard-operable forms.

## Tooling

This project was built with AI assistance (Claude Code). Commits written with the assistant carry a co-author trailer.
