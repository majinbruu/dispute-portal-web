# ACME Bank Dispute Portal (web)

The web app of a transaction dispute portal for the fictional ACME Bank. It has two sides. A customer signs in, sees the debit orders and card transactions on their account, disputes the ones they are entitled to dispute, follows each dispute to its outcome, and reads notifications about it. A bank agent signs in to the same app, sees the disputes of all customers, and approves or rejects each one. Customer and agent can talk to each other in a comment thread on the dispute.

This repository holds the React front end. The API, the database, the identity provider and the Compose files that run the whole system live in [dispute-portal-api](https://github.com/majinbruu/dispute-portal-api).

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Runbook: get it running](#runbook-get-it-running)
- [Other ways to run it](#other-ways-to-run-it)
- [Develop, build and test](#develop-build-and-test)
- [How it works](#how-it-works)
- [Configuration](#configuration)
- [Project structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Known limitations](#known-limitations)

## What it does

Which side of the portal a user gets depends on the role in their access token: `customer` or `agent`. A user sees only the pages of their own side.

### Customer portal

| Screen           | Route                                                                       | What the customer can do                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign in          | any address when signed out                                                 | Sign in through Keycloak                                                                                                                             |
| Transactions     | `/transactions`                                                             | Switch between two tabs, **Debit orders** and **Card**, filter and sort each list, page through it, and start a dispute where one is allowed         |
| Transaction      | `/transactions/:id`                                                         | See the details of one debit order or one card transaction, its dispute if it has one, and a **Dispute** button if it can be disputed                |
| Dispute form     | `/transactions/:id/dispute`                                                 | Choose one of the reasons offered for that transaction, add an optional comment, review, and submit                                                  |
| Dispute history  | `/disputes`                                                                 | See pending and completed disputes in two sections, debit order and card disputes together                                                           |
| Dispute progress | `/disputes/:id`                                                             | Follow the time-stamped timeline, withdraw the dispute while it waits for review, read the comment thread and add comments while the dispute is open |
| Mandates         | `/mandates`, `/mandates/debicheck`, `/mandates/registered`, `/mandates/:id` | Browse DebiCheck mandates and Registered mandates, and open one. Read-only                                                                           |
| Inbox            | `/inbox`                                                                    | Read notifications about disputes. Opening a message marks it as read. The navigation shows the number of unread messages                            |

**Transactions.** Debit orders and card transactions are never in one list; each has its own tab.

- The **Debit orders** tab shows one kind of debit order at a time. **Mandate type** is a required filter with three values: DebiCheck, Registered Mandate and EFT. **Status** narrows the list to Accepted or Rejected collections.
- The **Card** tab has a **Status** filter: Settled, Pending, Declined or Reversed.
- Both tabs sort by newest, oldest, highest amount or lowest amount, and show ten transactions a page. The tab, filters, sort order and page are kept in the address, so a filtered list can be bookmarked and the back button returns to it.

A **Dispute** button appears only on transactions the API reports as disputable. There are no "cannot dispute" messages: where a transaction cannot be disputed, the button is simply absent. A transaction that already has a dispute links to it.

**Transaction details.** A debit order shows its statement text, date, status, transaction ID, contract reference and account, and links to its mandate. An EFT debit order has no mandate, so it has no mandate link. A card transaction shows the merchant and its location, the card, the transaction and posting dates, status, any refunded amount, how the card was used (chip, tap, online or recurring payment), how the cardholder was verified, and the scheme references.

**Raising a dispute.** The form asks the API which reasons apply to that transaction and offers only those. Each reason shows its scheme code in brackets: an ISO 20022 code for a debit order, for example "The amount is not what I agreed to (AM09)", or the card scheme's code for a card transaction. The comment is optional and can be up to 1000 characters. Nothing is sent until the customer confirms on the review step. The dispute's own page opens after submission.

**Following a dispute.** A dispute is Submitted, Processing, Refunded, Declined or Withdrawn. While it is Submitted it waits for an agent, and the customer can withdraw it with **Withdraw dispute**, which asks for confirmation in the page before anything is sent. A withdrawn dispute is final, and the transaction can then be disputed again. The comment given at submission is the first comment in the thread. Comments from the customer are shown as "You" and comments from an agent as "ACME Bank". Comments can be added while the dispute is Submitted or Processing.

### Agent portal

| Screen        | Route                 | What the agent can do                                                                                                                                                       |
| ------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dispute queue | `/agent`              | See the disputes of all customers, those waiting for review first and the oldest of them at the top. Filter by status and transaction type, and search by dispute reference |
| Dispute       | `/agent/disputes/:id` | See the dispute, the disputed transaction, the audit trail and the comment thread. Approve the dispute, reject it with a reason, or add a comment                           |

**Reviewing.** **Approve** and **Reject** are offered only while a dispute is Submitted. Neither acts on its own: each opens a confirmation step in the page. Rejecting needs a reason of up to 500 characters, which the customer sees as the outcome of the dispute. Approving sends the dispute for processing; the outcome after that comes from the API's simulated scheme. An agent can add comments while the dispute is Submitted or Processing, and the customer gets an inbox message for each one. An agent cannot approve, reject or comment on a dispute they raised themselves as a customer: the API refuses it, and the page says that another agent must review it.

**What an agent sees.** The audit trail says who caused each step: the customer, an agent or the system. Customers and agents are shown by their ID, not by name. An agent has no transactions, mandates or inbox of their own, and no links into the customer pages.

## Tech stack

| Area               | Choice                                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language and build | TypeScript (strict), Vite                                                                                                                                                                   |
| UI                 | React 19, React Router, CSS Modules with design tokens, no component framework                                                                                                              |
| Server state       | TanStack Query                                                                                                                                                                              |
| Forms              | React Hook Form with Zod                                                                                                                                                                    |
| Sign-in            | OpenID Connect through Keycloak with `oidc-client-ts` and `react-oidc-context` (Authorization Code with PKCE)                                                                               |
| API client         | Types generated from the API's OpenAPI document with `openapi-typescript`, called with `openapi-fetch`                                                                                      |
| Unit tests         | Vitest, React Testing Library, jsdom                                                                                                                                                        |
| End-to-end tests   | Playwright (Chromium) against the running Compose stack                                                                                                                                     |
| Quality            | ESLint with type-checked rules, Prettier, type check                                                                                                                                        |
| Packaging          | Multi-stage Dockerfile, unprivileged nginx                                                                                                                                                  |
| CI                 | GitHub Actions: lint, format check, type check, unit tests with coverage thresholds, contract check, build, image build, end-to-end journeys, image publishing to GitHub Container Registry |

## Runbook: get it running

The web app needs the API and Keycloak to do anything beyond the sign-in screen. The simplest way to run it is the full stack from the API repository. That stack pulls this repository's published image, so you do not need to clone or build this repository to try the app. You only need Git and Docker.

The [API repository's README](https://github.com/majinbruu/dispute-portal-api#runbook-get-it-running) is the full runbook: how to install the prerequisites on each platform, what to do when a port is in use, and a guided walkthrough of the demo data. The short version follows.

### 1. Start the full stack

```sh
git clone https://github.com/majinbruu/dispute-portal-api.git
cd dispute-portal-api
docker compose up -d
```

The first run downloads the images. Check progress with:

```sh
docker compose ps
```

Wait until all four services (`postgres`, `keycloak`, `api`, `web`) show `healthy`, then open <http://localhost:3000>.

### 2. Sign in

All four demo users have the password `AcmeDemo!2026`. They exist only in the demo Keycloak realm of the API repository.

| Username | Role     | What you will see                                                                                                           |
| -------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `thandi` | customer | A full history: debit orders of all three kinds, card transactions, mandates, pending and completed disputes, notifications |
| `sipho`  | customer | A second customer with a Mastercard, to see that customers cannot see each other's data                                     |
| `lerato` | customer | No data, to see the empty states                                                                                            |
| `zanele` | agent    | The dispute queue across all customers                                                                                      |

A browser holds one Keycloak session at a time. To be a customer and the agent side by side, sign in as the agent in a private window or a second browser.

A new dispute stays on Submitted until an agent reviews it. Sign in as `zanele` to approve or reject it.

### 3. Stop it

```sh
docker compose down
```

To also delete the database, so the next start begins from fresh demo data:

```sh
docker compose down -v
```

## Other ways to run it

### Pull and run the published image on its own

CI publishes the image to GitHub Container Registry as `ghcr.io/majinbruu/dispute-portal-web`, tagged `latest` and with the full commit SHA of this repository. The package is public, so no sign-in is needed to pull it.

```sh
docker pull ghcr.io/majinbruu/dispute-portal-web:latest
```

The container needs four environment variables (see [Configuration](#configuration)) that point it at an API and a Keycloak realm that are already running. With the API on port 5080 and Keycloak on port 8080 of the same machine:

Bash:

```sh
docker run --rm -p 3000:8080 \
  -e OIDC_AUTHORITY=http://localhost:8080/realms/acme-bank \
  -e OIDC_ORIGIN=http://localhost:8080 \
  -e OIDC_CLIENT_ID=dispute-portal-web \
  -e API_UPSTREAM=http://host.docker.internal:5080 \
  ghcr.io/majinbruu/dispute-portal-web:latest
```

PowerShell:

```powershell
docker run --rm -p 3000:8080 -e OIDC_AUTHORITY=http://localhost:8080/realms/acme-bank -e OIDC_ORIGIN=http://localhost:8080 -e OIDC_CLIENT_ID=dispute-portal-web -e API_UPSTREAM=http://host.docker.internal:5080 ghcr.io/majinbruu/dispute-portal-web:latest
```

`host.docker.internal` reaches the host machine from a container on Docker Desktop. On Linux, add `--add-host=host.docker.internal:host-gateway` to the command.

To pin the web image inside the full stack, set `WEB_IMAGE_TAG` to a commit SHA of this repository in the API repository's `.env` file.

### Build this image from source

```sh
git clone https://github.com/majinbruu/dispute-portal-web.git
cd dispute-portal-web
docker build -t dispute-portal-web:local .
```

Run it with the `docker run` command above, with `dispute-portal-web:local` as the image name.

To run your build inside the full stack instead, clone both repositories side by side, start the stack as in the runbook, and use the build file in the API repository. This builds and replaces only the web container and leaves the rest of the stack running:

```sh
cd ../dispute-portal-api
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build --no-deps web
```

The API repository's README describes that build file under [Build both images from source](https://github.com/majinbruu/dispute-portal-api#build-both-images-from-source).

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

### Run the dev server against the stack

The dev server needs the API and Keycloak, and it needs port 3000 for itself. In your clone of the API repository, start everything except the web container:

```sh
docker compose up -d api
```

This also starts PostgreSQL and Keycloak, which the API depends on. If the full stack is already running, free port 3000 instead:

```sh
docker compose stop web
```

Then, in this repository:

```sh
npm ci
npm run dev
```

The dev server runs at <http://localhost:3000> and proxies `/api` to the API on `http://localhost:5080`. It must be port 3000, because that is the only address the demo Keycloak realm allows. If the port is taken, the dev server stops instead of choosing another one.

### Checks

```sh
npm run lint
npm run format:check
npm run typecheck
npm test
npm run test:coverage
npm run build
```

| Script                  | What it does                                                         |
| ----------------------- | -------------------------------------------------------------------- |
| `npm run dev`           | Vite dev server on port 3000                                         |
| `npm run build`         | Type check and build to `dist/`                                      |
| `npm run preview`       | Serve the production build locally on port 3000                      |
| `npm test`              | Unit tests                                                           |
| `npm run test:coverage` | Unit tests with the coverage thresholds below                        |
| `npm run e2e`           | End-to-end journeys with Playwright, against a stack that is running |
| `npm run e2e:report`    | Open the HTML report of the last end-to-end run                      |
| `npm run lint`          | ESLint                                                               |
| `npm run format`        | Format with Prettier                                                 |
| `npm run format:check`  | Check formatting                                                     |
| `npm run typecheck`     | TypeScript only, for the app and for the end-to-end tests            |
| `npm run generate:api`  | Regenerate `src/api/schema.d.ts` from `api/openapi.json`             |
| `npm run check:api`     | Fail if the committed API types differ from the OpenAPI document     |

### Unit tests

The unit tests run in jsdom with Vitest and React Testing Library. They need neither Docker nor the API: every screen is rendered against mocked API responses.

They cover:

- formatting of money and dates, labels, problem-details parsing and configuration validation;
- the shared components, including the timeline, tabs, pager and the in-page confirmation step;
- sign-in: the sign-in screen, the callback, the return to the page the user asked for, the in-memory session, and reading the role from the token;
- routing by role: a customer gets the customer pages, an agent gets the agent pages, each gets "Page not found" for the other's pages, and an account with neither role gets the no-access screen;
- each customer screen: both transaction tabs with their filters, both kinds of detail page, the dispute form with its idempotency key and the message shown for each API error, dispute history, the dispute page with polling, withdrawal and comments, mandates and the inbox;
- the agent screens: the queue with its filters and search, and the review page with approve, reject, comments, the conflict cases and the refusal of an agent's own dispute.

`npm run test:coverage` reports coverage for all of `src` and fails below these thresholds, which apply to each of `src/auth`, `src/lib`, `src/components` and `src/features` (every feature folder together):

| Measure    | Threshold |
| ---------- | --------- |
| Lines      | 80%       |
| Statements | 80%       |
| Functions  | 80%       |
| Branches   | 70%       |

### End-to-end tests

The Playwright journeys in `e2e/` drive a real browser (Chromium) through the running stack: the web app, the API, Keycloak and PostgreSQL. They sign in on Keycloak's own sign-in page, as a user would. They start nothing themselves, so the stack must be running first (see the [runbook](#runbook-get-it-running)).

```sh
npm ci
npx playwright install chromium
npm run e2e
```

On Linux the browser may need system libraries; `npx playwright install --with-deps chromium` installs them too. After a run, `npm run e2e:report` opens the HTML report. A failed journey leaves a trace and a screenshot in `test-results/`.

| Journey                   | File                            | What it proves                                                                                                                                                                                                                                                                                        |
| ------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Access by role (agent)    | `access.spec.ts`                | An agent lands on the dispute queue, has only the queue in the navigation, and gets "Page not found" when opening `/transactions` directly                                                                                                                                                            |
| Access by role (customer) | `access.spec.ts`                | A customer lands on Transactions, has only the customer navigation, and gets "Page not found" when opening `/agent` directly                                                                                                                                                                          |
| Approved and refunded     | `debit-order-dispute.spec.ts`   | A customer disputes a Registered Mandate debit order with a comment. An agent, in a browser context of their own, finds it in the queue by its reference, sees the comment and approves it. The customer's open page moves to Processing and then Refunded, and the inbox has a message for each step |
| Rejected with a reason    | `card-dispute-rejected.spec.ts` | A customer disputes a card purchase. An agent rejects it with a reason. The customer's open page shows it as Declined with that reason, and the dispute can no longer be withdrawn                                                                                                                    |
| Withdrawn                 | `withdraw-dispute.spec.ts`      | A customer disputes an EFT debit order, withdraws it through the in-page confirmation, sees it as Withdrawn, and can open the dispute form for the same transaction again                                                                                                                             |

The journeys run one at a time, because they share one demo customer and the API limits how many disputes a customer may raise per minute. The approval journey waits for the simulated scheme's answer, which takes about half a minute.

**The journeys use up demo data.** Each journey picks a transaction that the list currently offers for dispute, so the suite can run again on a stack that holds the disputes of earlier runs. But a full run uses up one Registered Mandate debit order and one card purchase for good: once a dispute is refunded or declined, that transaction cannot be disputed again. The withdrawal journey gives its transaction back. On a fresh stack the demo customer has enough disputable transactions for about three full runs, and fewer once the stack is more than a day old, because some of them are seeded on the last day of their dispute window. When they run out, a journey fails with a message that says so. Reset the demo data from the API repository:

```sh
docker compose down -v
docker compose up -d
```

These environment variables change where the journeys run and who they sign in as. The defaults are the demo stack's own values.

| Variable                | Default                 | Purpose                              |
| ----------------------- | ----------------------- | ------------------------------------ |
| `E2E_BASE_URL`          | `http://localhost:3000` | Address of the web app               |
| `E2E_CUSTOMER_USERNAME` | `thandi`                | The customer the journeys sign in as |
| `E2E_CUSTOMER_PASSWORD` | the demo password       | That customer's password             |
| `E2E_AGENT_USERNAME`    | `zanele`                | The agent the journeys sign in as    |
| `E2E_AGENT_PASSWORD`    | the demo password       | That agent's password                |

### Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and on every pull request. A newer push to the same branch cancels the run that is still in progress.

| Job                          | What it does                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint, typecheck, test, build | `npm ci`, ESLint, the Prettier check, the type check, the unit tests with the coverage thresholds, a check that the committed API types match `api/openapi.json`, and the production build                                                                                                                                                                                                     |
| Docker image                 | Builds the image from the Dockerfile                                                                                                                                                                                                                                                                                                                                                           |
| End-to-end journeys          | Checks out this repository and the API repository side by side, installs Chromium, starts PostgreSQL, Keycloak and the published API image with the API repository's Compose file, builds the web image from the commit under test and starts it, then runs the journeys. On failure it prints the stack's logs and uploads the Playwright report and traces. A failed journey is retried once |
| Publish image                | Only for pushes to `main`, and only after the three jobs above pass. Builds the image and pushes it to `ghcr.io/majinbruu/dispute-portal-web` as `latest` and under the commit SHA. Pull requests never publish                                                                                                                                                                                |

Third-party actions are pinned to commit SHAs. Only the publishing job may write packages, and it signs in to the registry with the workflow's own token, so no registry secret is stored.

### When the API contract changes

`api/openapi.json` is a copy of the API's contract. With both repositories cloned side by side, copy the new document from the API repository and regenerate the types:

```sh
cp ../dispute-portal-api/docs/api/openapi.json api/openapi.json
npm run generate:api
npm run typecheck
```

The type check then points at every place that needs to change.

## How it works

**Sign-in.** The app uses the Authorization Code flow with PKCE as a public client, so there is no client secret in the browser. Tokens are kept in memory only, never in `localStorage`, which limits what a script injection could steal. The cost is that a page reload shows the sign-in screen again; one click signs back in through the Keycloak session, and the user returns to the page they asked for. The app never redirects to Keycloak on its own: sign-in always starts from the button, which rules out redirect loops when the identity provider is misconfigured. A 401 from the API ends the local session.

**Two portals, one app.** After sign-in the app reads the `roles` claim from the access token. A user with the `agent` role gets the agent's route table and navigation; a user with the `customer` role gets the customer's. Each role is given only its own routes, so the other side's pages are not hidden behind a check: for that user they do not exist, and their addresses show "Page not found". An account that somehow has both roles is treated as an agent. An account with neither role sees a "You do not have access" screen with a sign-out button, and the app makes no API calls for it.

This routing only decides what the browser shows. The app does not verify the token it reads the role from, and anyone can change what runs in their own browser. Access is enforced by the API, which verifies the token on every request and refuses a customer token on the agent endpoints and an agent token on the customer endpoints.

**Talking to the API.** Every call goes to `/api` on the same origin and carries the access token. nginx proxies `/api` to the API, so the browser needs no cross-origin setup. Errors from the API are RFC 9457 problem documents; the app shows their message and the trace ID.

**Raising a dispute safely.** The form creates one idempotency key per submission and reuses it on retry, so a double click or a retried request cannot create two disputes. If the customer goes back and changes the reason or the comment, a new key is used.

**Live progress.** The customer's dispute page re-reads the dispute every three seconds while it is pending, that is, Submitted or Processing. That is how an agent's decision, the scheme's outcome and new comments appear without a reload. Polling stops when the dispute reaches an outcome. The unread count in the navigation is re-read every 30 seconds. Nothing else is polled: every other screen reads its data when it is opened and again when the browser window regains focus.

**When two people act at once.** A customer can withdraw a dispute in the same moment that an agent decides it, and two agents can decide the same dispute. The API lets one of them win and answers the other with a 409. The app then re-reads the dispute, shows its latest status and says in plain words what happened.

**Security headers.** nginx sends a Content-Security-Policy that allows scripts and styles from the app's own origin only, and connections only to the app and the configured identity provider. It also sends `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` and `Cross-Origin-Opener-Policy`. The container runs as a non-root user.

## Configuration

Settings are read at runtime, not baked in at build time, so one image runs in every environment. `index.html` loads `/config.js` before the app. In development that file is `public/config.js`. In the container nginx generates it from environment variables.

| Variable         | Purpose                                                       |
| ---------------- | ------------------------------------------------------------- |
| `OIDC_AUTHORITY` | Issuer URL of the Keycloak realm, as the browser reaches it   |
| `OIDC_ORIGIN`    | Origin of that issuer, allowed by the Content-Security-Policy |
| `OIDC_CLIENT_ID` | Public OIDC client ID                                         |
| `API_UPSTREAM`   | API base URL as nginx reaches it, without a trailing slash    |

All four are required; nginx will not start without them. The container listens on port 8080, serves the app, proxies `/api/` to the API and answers `/healthz`. It does not expose the API's health or metrics endpoints: `/health` and `/metrics` answer 404.

The app must be reached at an origin registered as a redirect URI on the Keycloak client. In the demo realm that is `http://localhost:3000`.

## Project structure

```
api/                 OpenAPI contract the types are generated from
e2e/                 Playwright journeys and their helpers
nginx/               nginx templates: app, /config.js, /api proxy, security headers
src/app/             providers, the router for each role, layout, error boundary
src/auth/            OIDC sign-in, session, roles, the no-access screen
src/api/             generated schema, typed client, query hooks
src/features/        transactions, disputes, mandates, inbox, agent
src/components/      shared UI components
src/lib/             configuration, formatting, labels, problem-details parsing
src/styles/          design tokens and global styles
src/test/            unit test helpers and fixtures
playwright.config.ts end-to-end test settings
Dockerfile           build stage (Node) and runtime stage (nginx)
```

## Troubleshooting

| Symptom                                                            | Cause and fix                                                                                                        |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| The sign-in screen appears again after a page reload               | Expected. Tokens are kept in memory only. One click signs back in                                                    |
| Signing in as the agent shows the customer, or the other way round | One browser holds one Keycloak session. Sign out first, or use a private window for the second user                  |
| "Page not found" for an address that exists                        | The page belongs to the other role. `/agent` exists only for an agent, and the customer pages only for a customer    |
| "You do not have access" after sign-in                             | The account has neither the `customer` nor the `agent` role                                                          |
| A new dispute stays on Submitted                                   | Expected. It waits for an agent. Sign in as `zanele` and approve or reject it                                        |
| Keycloak shows "Invalid parameter: redirect_uri"                   | The app is not at `http://localhost:3000`. Use that exact address, not `127.0.0.1` or another port                   |
| Every screen shows an error after sign-in                          | The API is not reachable. Check `docker compose ps` in the API repository                                            |
| The web container exits at start                                   | One of the four environment variables is missing, or the `API_UPSTREAM` host name does not resolve                   |
| `npm run dev` fails because port 3000 is in use                    | The web container from the full stack is still running. Stop it with `docker compose stop web` in the API repository |
| An end-to-end journey cannot reach the app or the sign-in page     | The stack is not running, or not yet healthy. Check `docker compose ps` in the API repository                        |
| An end-to-end journey says no transaction can be disputed any more | Earlier runs used up the demo data. Run `docker compose down -v` and `docker compose up -d` in the API repository    |
| The stack runs an old web image after new commits                  | `docker compose up` does not pull a newer `latest` by itself. Run `docker compose pull` in the API repository first  |

## Known limitations

- **The browser only decides what to show.** The role is read from the access token's payload without verifying the token. That is enough to choose a route table and not enough to protect anything, which is why the API enforces access on every request.
- **Both portals ship in one bundle.** A customer's browser downloads the code of the agent screens and the other way round. The agent screens hold no data and no secrets; everything they show comes from agent endpoints that refuse a customer token.
- **Polling, not push.** A pending dispute is re-read every three seconds while its page is open. There is no server push.
- **The agent pages do not refresh on their own.** The queue and the review page show what was read when they were opened, or when the browser window last regained focus. A new dispute or a customer's new comment does not appear until then. An agent who acts on a dispute that has changed in the meantime gets a clear message and the latest state.
- **The inbox does not refresh on its own.** The unread count in the navigation is re-read every 30 seconds, but the message list is not. It is read when the inbox is opened and when the browser window regains focus, so a message that arrives while the inbox is open does not appear by itself.
- **Agents see IDs, not names.** The review page shows the customer, and whoever caused each step or wrote each comment, by subject ID. The API does not return names.
- **Fewer filters than the API offers.** The transaction lists have no date range filter, the agent queue has no sort control, and the inbox has no "unread only" filter, although the API supports all three.
- **In-memory sessions.** A page reload needs one click to sign in again.
- **End-to-end tests are narrow.** They run in Chromium only, at one desktop window size, with one customer and one agent. They use up demo data, as described above. In CI they run the web image of the commit under test against the published `latest` API image, so a change that needs a newer API passes only once that API image is published.
- **English only**, with South African formatting for money and dates.
- **No offline support**, and no automated accessibility audit. The app uses semantic HTML, labelled controls, visible focus and keyboard-operable forms.

## Tooling

This project was built with AI assistance (Claude Code). Commits written with the assistant carry a co-author trailer.
