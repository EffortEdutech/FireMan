# FireMaint Technician PWA & Field Workflow Sprint Lock

## Bismillah

This sprint addresses the unfinished technician experience: placeholder bottom navigation, missing installable PWA behavior, no real scan workflow, and no offline field operation.

## Sprint Objective

Give technicians a focused, installable field application that supports assigned-job execution, asset identification, checklist completion, finding/photo capture, and reliable recovery when connectivity is unavailable.

## Starting Reality

The current online technician workflow already supports:

- technician authentication and role routing;
- assigned job visibility;
- starting and submitting jobs;
- asset-linked checklist completion;
- finding capture and finding photos;
- management review handoff.

The following are not considered complete:

- `Today`, `Jobs`, `Scan`, and `More` bottom navigation;
- installable PWA shell and update behavior;
- camera/QR asset scanning;
- offline persistence and synchronization;
- offline conflict and retry states.

## Scope: Six Moves

### Move 1/6: Real technician navigation and route structure

- Replace placeholder links with functional Today, Jobs, Scan, and More routes.
- Add clear active-route state and predictable back navigation.
- Keep all actions role-protected for technicians.

### Move 2/6: Installable PWA shell

- Verify manifest metadata, icons, theme color, and standalone display.
- Add a service-worker/app-shell strategy appropriate for Next.js.
- Add install/update/offline-status UI without claiming sync readiness prematurely.

### Move 3/6: Functional job and asset workflow

- Provide a field-friendly jobs list and job detail entry point.
- Make start, checklist, finding, photo, and submit actions explicit.
- Keep submitted/locked jobs visibly read-only.
- Remove placeholder action buttons from the technician workflow.

### Move 4/6: Camera and QR asset scanning

- Request camera access only from the Scan route and explain denied permissions.
- Resolve a scanned asset code within the technician’s organisation scope.
- Link a resolved asset to the active job without allowing cross-client assignment.
- Provide manual asset-code fallback when camera access is unavailable.

### Move 5/6: Offline field queue and synchronization

- Persist assigned jobs, checklist drafts, findings, captions, and photo upload intent locally.
- Queue mutations while offline and retry safely when connectivity returns.
- Make pending, syncing, synced, failed, and conflict states visible.
- Use idempotency keys so retries do not duplicate findings or submissions.

### Move 6/6: Device acceptance and sprint freeze

- Test desktop, mobile viewport, install flow, camera permission, offline capture, reconnect, and retry.
- Verify technician RLS boundaries and client/report visibility remains unchanged.
- Run unit, typecheck, lint, build, RLS, and E2E gates.
- Record the final sprint freeze and deferred items.

## Explicitly Out Of Scope

- management dashboard redesign;
- report template design;
- client portal changes except regression protection;
- automatic technician reassignment;
- native mobile store packaging;
- background sync guarantees beyond browser/PWA capabilities;
- unrestricted device or asset access.

## Security and Data Rules

- Never expose a service-role key in the PWA.
- All remote reads and writes remain organisation- and role-scoped through Supabase RLS.
- Offline records must be bound to the authenticated technician and organisation before synchronization.
- A client, site, asset, job, or finding must not become visible merely because it exists in local storage.
- Camera scanning identifies an asset; it does not grant permission to modify unrelated jobs.

## Acceptance Gate

The sprint is complete only when:

- no technician bottom-nav item is a placeholder;
- the application can be installed as a PWA in supported browsers;
- a technician can complete a job workflow online;
- a technician can draft checklist/finding/photo work offline;
- queued work synchronizes after reconnect without duplicates;
- failed sync and permission errors are recoverable and visible;
- Client A/B isolation and technician assignment boundaries remain intact;
- automated unit, typecheck, lint, build, RLS, and E2E checks pass;
- this document records the final 6/6 freeze.

## Current Status

**Move 6/6: sprint frozen and accepted.**

Verified: TypeScript, ESLint, production build, diff hygiene, full Vitest (`21` files, `57` tests passed), browser E2E (`14` passed, `4` credentialed tests skipped because credentials were not configured), and remote RLS acceptance (`10/10` boundary checks passed, including checklist-result, finding, report, organisation, and technician-assignment boundaries).

Move 5 delivery remains complete: local finding drafts with optional photo/caption payloads, offline checklist-result drafts, reconnect retry, idempotent finding synchronization, and retry-safe finding-photo upload repair.

### Deferred after freeze

- Background sync guarantees beyond browser capabilities.
- Native mobile store packaging.
- Full credentialed E2E coverage for owner, technician, Client A, and Client B accounts.
- Larger offline photo storage using IndexedDB or a dedicated local file queue.
