# Orbit board prototype

A lightweight, local-first kanban board for importing a Markdown or JSON task
list, moving tasks through three workflow stages, and discussing tasks in place.
It runs directly in a browser and does not need a build step or backend.
“Intelligent Integration & Management” is the current working slogan; Orbit is
a prototype name, not a third-party service.

## Run

Open `index.html` in a browser or serve/deploy this folder to GitHub Pages. For
a local HTTP preview from the repository root, run
`python3 -m http.server 8765 --directory integration-orbit` and open
`http://localhost:8765`. Board changes, comments, chat messages, subscriber
lists, preferences, roles, and local audit records are saved in that browser's
local storage. No build or package installation is required.

## Import

Use the upload button in the board toolbar to select a `.md`, `.markdown`,
`.txt`, or `.json` file. Markdown task bullets are grouped by headings:

```md
## To do
- [ ] Write release notes

## In progress
- [ ] Review onboarding

## Done
- [x] Confirm launch date
```

Checked Markdown items under `To do` are also imported as done. JSON may be an
array of tasks or an object with a `tasks` array. Tasks accept `title` (or
`name`), `description`, `status`, `label` (or `category`), `priority`,
`assignee` (or `owner`), and `due` (or `dueDate`).

Versioned JSON board configurations follow
[`schemas/orbit-board-config.schema.json`](./schemas/orbit-board-config.schema.json);
[`board.config.example.json`](./board.config.example.json) is an importable
example. Export the current configuration from Administration. The versioned
format carries board metadata, task fields, AI budgets, and human-paced API
limits; it intentionally excludes chat messages, subscriber email addresses,
and credentials.

### Project and task formatting conventions

- Use a concise, outcome-oriented board name and one-sentence description.
- Versioned config uses exactly `todo`, `doing`, and `done` status identifiers.
  Markdown headings may use `To do`/`Backlog`, `In progress`/`Doing`, and
  `Done`/`Completed`.
- A task should represent one independently reviewable outcome. Use an
  imperative title; keep acceptance criteria and context in `description`.
- Priority is `High`, `Medium`, or `Low`. Use short, consistent category labels.
- Use real ISO calendar dates (`YYYY-MM-DD`) and valid dates for due fields.
- Markdown imports use normal task bullets (`- [ ]` and `- [x]`). Use headings
  to define stages; put wrapped prose in the task description, not another
  ambiguous task bullet.
- Versioned JSON has `version: 1`, a `board` object, and `tasks` array.
  [`schemas/orbit-board-config.schema.json`](./schemas/orbit-board-config.schema.json)
  rejects unknown keys so typos and accidental secret fields are visible.
  Never store tokens, OAuth secrets, passwords, or connection strings in a
  board file.

Example Markdown:

```md
# Website launch
Coordinate reviewed work for the launch.

## To do
- [ ] Define the event schema
- [ ] Confirm retention requirements

## In progress
- [ ] Build the first dashboard

## Done
- [x] Select the release window
```

## Move and discuss

Drag cards between the three columns, or open a card to edit its details and
add comments. The board is saved locally as you work. Use the download button
to export the current board as Markdown.

## Share

Share actions copy a portable snapshot link or a short message for Slack,
Microsoft Teams, and Discord. The link contains the task and discussion data
in its URL fragment and can be opened by anyone who has access to this app.
It is a snapshot, not a shared live workspace: recipients' edits do not sync
back to the sender. For Google Drive or multi-user collaboration, host the app
and shared board data on an appropriate storage or collaboration service.

## Team communication and email summaries

The Discuss panel includes a messenger-style board chat saved in the current
browser. Its GitHub Issues and Discussions channels link to the
[`tyfoon-sec/Projects`](https://github.com/tyfoon-sec/Projects) repository so
the team can continue public project conversations there. The email panel lets
you manage a local subscriber list, choose a summary cadence, select update
types, preview a board recap, and copy it for email. These are frontend
workflows only: messages are not broadcast to other browsers, and email is not
sent without connecting a backend, GitHub integration, or mail service.

## Ticket generation and AI resource guardrails

The Generate tickets workflow turns pasted checklist items or short brief
sentences into draft tickets in a local preview. It does not call an AI model.
The UI also exposes configurable per-run token and time limits, a daily token
budget, concurrency, human approval, and stop-on-stall preferences. These
preferences are saved locally for the prototype only; they cannot constrain
model usage from a browser. A production AI runner must enforce those controls
server-side, provide cancellation and usage accounting, and keep model API keys
out of the static app.

Time, cost, and quality are first-class execution constraints: bound runtime and
parallel sessions, cap per-run and daily token use, validate generated output,
and require review before publishing tickets. Secure communication and tool
boundaries are the overarching requirement. A production pipeline should use
authenticated, encrypted transports, repository-scoped least-privilege
credentials, an explicit integration allowlist, human approval for external
writes, isolated execution, untrusted-input handling, and auditable actions.
Do not expose credentials in board comments, public GitHub Issues/Discussions,
or model prompts. The visible policy switches in this prototype are local
preferences and are not security enforcement.

## Shared analytics and machine learning direction

The intended intelligence layer is shared, permissioned analytics—not a
collection of independent chat bots. Human users and approved bots should read
the same tenant-scoped, read-only task and aggregate-data APIs, with role-based
access, provenance, and audit events. Useful ML workloads include delivery
forecasting, anomaly detection, work classification, and recommendations;
generative ticket drafting is optional and remains behind review and resource
budgets.

For a production data architecture, keep PostgreSQL (or local SQLite for
offline use) as the transactional source of truth, stream versioned task and
audit events through a secured collector, and use ClickHouse or a governed
Parquet/object-store lake for high-volume analytics and ML feature generation.
Use OpenTelemetry/Telegraf with InfluxDB and Grafana (the TIG stack) for
operational time-series metrics and dashboards. Expose aggregate results and
approved ML features through an authenticated, tenant-scoped API to both users
and bots; do not give bots direct database or filesystem access. Enforce data
minimization, retention, model-feature provenance, and tenant isolation in
services, not browser preferences.

The console currently aggregates local task and audit activity to demonstrate
the business-intelligence views, allows board and role edits, and exports a
local ECS-aligned NDJSON event stream. Its member roles, groups, permissions,
identity providers, audit trail, shared-bot policy, and pipeline status are
prototype UI only; no central database, collector, ML service, OAuth provider,
or Grafana instance is connected.

## Elastic-style logs and incident response

Open **Elastic logs** for an ECS-style event explorer with time, severity,
category, and full-document search; event timeline and severity summaries;
per-event metadata inspection; principal filtering; mark-reviewed and
investigation-case actions; and filtered NDJSON export. Import `.json`,
`.ndjson`, or `.jsonl` files containing ECS-shaped events (a single event, an
array of events, or Elasticsearch Search API `hits.hits` results) to review
external records in the prototype. Imports are limited to 10 MB and 5,000
events per file. The accepted minimum event shape is documented in
[`schemas/ecs-event.schema.json`](./schemas/ecs-event.schema.json).

Audit records include available ECS-style fields such as `@timestamp`,
`ecs.version`, `event.id`, `event.category`, `event.action`, `event.outcome`,
`event.severity`, user identity/roles, service, agent, host, workspace, trace
and correlation IDs, provenance, and message details. IP, device posture, and
identity-provider telemetry are explicitly shown as unavailable unless a
trusted source supplies them. Imported events are stored and displayed
locally; the app does not connect to Elasticsearch. The local log is neither
tamper-resistant nor a SIEM system of record. Production incident response
requires authenticated ingestion, immutable centrally retained events,
clock-sync and source validation, protected analyst access, tenant boundaries,
case workflows, alerting, enrichment, and documented response procedures.

## Threat intelligence workflow (scope planner only)

The **Threat map** view is a planning interface for an eventual closed-loop
intelligence workflow: define authorized scope → run selected passive
transformations → correlate evidence with provenance → analyst review → create
and track remediation tasks. It accepts domain names, email addresses, and
canonical public GitHub user, organization, or repository identifiers. The
draft and selected transformation profile are saved in this browser only.
Saving a scope or exporting its Markdown report makes no network requests and
produces no findings; the current map displays only the assets you entered.
Authorization and email-consent checkboxes are local self-attestations, not
proof of ownership or consent.

The candidate adapter allowlist is deliberately small: RDAP registration
metadata, basic DNS records (A/AAAA, MX, NS, TXT), Certificate Transparency
records, public GitHub API metadata, and public `robots.txt`/`security.txt`
metadata. There is no active scanning, port probing, exploit validation,
credential testing, breach-dump search, private-account enrichment, or
unbounded crawling. The queue control remains disabled until a secured backend
exists. The OpenAPI definitions for `threat-intel` are a future contract, not
deployed routes or live integrations.

Before implementing those routes, the backend must verify authorization for
each target (the UI checkbox is never sufficient), require a verifiable
authorization record, and apply a fixed provider allowlist, outbound egress
policy, DNS/IP rebinding defenses, strict request and response size limits,
tenant isolation, deduplication, rate/concurrency/total-request budgets,
timeouts, cancellation, safe redirect policy, and audit retention. Keep
provider credentials server-side. Never turn user-supplied targets into
unrestricted server-side requests. For email addresses, require documented
organizational purpose and appropriate consent; avoid personal profiling and
do not query breach or credential datasets.

Every returned fact and graph edge must retain provider, source URL, collection
time, exact transformation, and confidence. Mark observations as source facts
or analyst/model inferences; include model/version and explicit uncertainty
for inferred relationships. Do not present a candidate correlation as a
confirmed relationship. Scope-only reports must clearly say that no source was
contacted and no intelligence was collected. Analyst approval should be
required before a finding becomes a workflow task, and remediation closure
should link back to the reviewed evidence and audit history.

When a backend is deployed, a run request follows this shape (the referenced
authorization record must already exist and be verified server-side):

```sh
curl --fail-with-body --request POST \
  "$ORBIT_API/v1/workspaces/workspace-123/threat-intel/runs" \
  --header "Authorization: ******" \
  --header "Content-Type: application/json" \
  --header "Idempotency-Key: 827d91d4-9360-4e37-9614-1a340e9b0552" \
  --data '{
    "assets": [{"type": "domain", "value": "example.com"}],
    "transformations": ["rdap", "dns-basic"],
    "authorizationReference": "authz-record-123"
  }'
```

The proposed API caps a run at 20 assets, 50 provider requests, 120 seconds,
one concurrent run per workspace, two submissions per principal per minute,
and ten runs per workspace per hour. These are contract defaults to enforce
and tune against the deployed providers, not capabilities currently present
in this static app. Results use typed findings and relationships with required
provenance; callers need `threat:run`, `threat:read`, and `threat:cancel` scopes
for submission, inspection, and cancellation respectively.

The proposed agent API contract is
[`api/openapi.yaml`](./api/openapi.yaml) (OpenAPI 3.1). Its human-paced defaults
are 6 calls/minute per agent, 20 calls/minute per workspace, at most 2
concurrent runs, 10 seconds between external actions, a 10-run queue, and one
retry. The contract uses OAuth2 scopes, idempotency keys, bounded retries,
cancellation, human approval for external writes, and `429`/`Retry-After`
responses. These are proposed server-enforced limits, not live API behavior.

### API use (contract only; no server is deployed)

`api/openapi.yaml` is the authoritative OpenAPI 3.1 contract. Replace the
example host with a deployed HTTPS API, then obtain a short-lived OAuth2
access token from the configured identity provider. Keep the token in a secret
manager or process environment; never put it in the board, URL, source, or
browser storage. The server must authorize the requested workspace and
principal on every request.

Queue an agent run with a unique idempotency key. Only send task IDs and
minimum required context; the service resolves user identity from the access
token (it must not trust a client-supplied `requestedBy`):

```sh
curl --fail-with-body --request POST "$ORBIT_API/v1/agent-runs" \
  --header "Authorization: Bearer $ORBIT_ACCESS_TOKEN" \
  --header "Content-Type: application/json" \
  --header "Idempotency-Key: 7d5c9d91-6629-4eb4-9218-13c4e17e212e" \
  --data '{
    "workspaceId": "workspace-123",
    "workflowId": "review-task",
    "taskIds": ["task-42"],
    "context": {"analyticsQuery": "summarize delivery status"}
  }'
```

The accepted response is `202 Accepted` with a `runId` and queued status.
Check progress and cancel through the corresponding `/agent-runs/{runId}`
and `/agent-runs/{runId}/cancel` endpoints. Read aggregate-only analytics at
`/workspaces/{workspaceId}/analytics/summary` with the `analytics:read` scope;
read effective limits from `/workspaces/{workspaceId}/agent-policies` with
`policy:read`.

On `429 Too Many Requests`, honor `Retry-After` and rate-limit headers. Retry
only transient errors, use the *same* idempotency key for the same action, and
apply bounded exponential backoff with jitter. Do not retry authorization or
validation errors. `401` requires re-authentication; `403` requires access
review; `409` indicates an idempotency conflict; `422` indicates invalid input.
The service must stop rather than queue unbounded work, enforce per-principal
and workspace limits, audit cancellation and external writes, and require
human approval before a bot modifies external systems.

All shown API operations are a contract/design only: there is no currently
deployed API endpoint, OAuth client, queue, or model runner in this static
prototype.

The admin prototype offers GitHub OAuth and Google OIDC setup paths, LDAP-style
groups, individual/group permission matrices, and bot roles. Production should
resolve identity and ACLs on every API request using a server-side OAuth/OIDC
integration and a trusted directory; none of the browser-side controls grant
real access.

## Formatting, accessibility, and contribution checks

- Keep browser code dependency-free unless the project explicitly adopts a
  package/build system. Use semantic HTML, visible keyboard focus, labels for
  controls, and responsive layouts.
- Keep task/config/API examples in Markdown fenced code blocks with the
  language identifier (`md`, `json`, `sh`, or `yaml`). Wrap prose around
  80–100 columns where practical.
- Escape user-controlled text before rendering HTML. Never interpolate
  untrusted values as styles, selectors, or executable markup.
- Record meaningful user actions with timestamped ECS fields; do not log
  credentials, tokens, sensitive prompt content, or unnecessary personal data.
- Before submitting changes: validate the example JSON against the JSON
  Schema, parse/lint `api/openapi.yaml`, run a JavaScript syntax check, run
  `git diff --check`, and smoke-test board, import/export, ACL, and log flows in
  a browser.
- A release/deployment does not turn the browser-local roles, event log, API
  quotas, or AI limits into server-enforced security controls.

## GitHub Pages

The repository workflow at `.github/workflows/deploy-orbit.yml` publishes this
folder as a static GitHub Pages site when changes are pushed to `main`. In the
repository settings, set **Pages → Build and deployment → Source** to **GitHub
Actions**. Pages hosting makes the app link easy to share; it does not provide
shared storage or real-time collaboration by itself.
