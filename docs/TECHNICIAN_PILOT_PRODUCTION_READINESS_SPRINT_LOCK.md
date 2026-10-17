# FireMaint Technician Pilot & Production Readiness Sprint Lock

## Bismillah

This sprint validates the frozen Technician PWA on real devices and closes the remaining release-readiness gaps before a controlled field pilot.

## Sprint Objective

Prove that a technician can install FireMaint, authenticate, find assigned work, identify assets, complete field evidence, operate through a connectivity interruption, recover safely, and finish the workflow without weakening organisation or role boundaries.

## Starting Reality

The previous Technician PWA & Field Workflow sprint is frozen at Move 6/6. The current product has:

- functional technician navigation and assigned-job workflow;
- installable PWA metadata and service-worker shell;
- camera/manual asset scanning;
- online checklist, finding, photo, and submission workflow;
- offline finding/photo and checklist draft queues;
- idempotent reconnect synchronization;
- passing unit, build, E2E routing, and RLS boundary gates.

The following remain pilot-readiness work:

- credentialed E2E coverage for all representative roles;
- real mobile device acceptance;
- larger offline photo storage and queue visibility;
- failed-sync and conflict recovery UX;
- release/version and install guidance;
- controlled pilot sign-off.

## Scope: Six Moves

### Move 1/6: Credentialed role acceptance

- Run authenticated E2E coverage for owner, technician, Client A, and Client B.
- Verify role redirects, report visibility, technician assignment boundaries, and logout.
- Keep test credentials outside the repository.

### Move 2/6: Real-device PWA acceptance

- Validate install, launch, standalone display, update behavior, and offline shell on supported mobile browsers.
- Test the Today, Jobs, Scan, and More routes at mobile dimensions.
- Record device/browser results and known limitations.

### Move 3/6: Field capture resilience

- Exercise camera permission, QR/manual fallback, checklist capture, finding capture, photo capture, and submission.
- Test interruption during each field action.
- Confirm submitted jobs remain visibly locked.

### Move 4/6: Offline storage and recovery hardening

- Move larger photo payloads from localStorage to IndexedDB or an equivalent bounded client queue.
- Show pending, syncing, synced, failed, and retry states.
- Preserve idempotency and prevent duplicate findings, checklist results, or photos.

### Move 5/6: Release observability and supportability

- Add client-visible app version and sync diagnostics for pilot support.
- Add structured client-side error context without exposing sensitive data.
- Document recovery steps for denied camera access, expired sessions, and failed sync.

### Move 6/6: Pilot sign-off and release freeze

- Complete unit, typecheck, lint, build, E2E, RLS, and real-device gates.
- Run one controlled pilot job from assignment through issued report.
- Record defects, deferred items, rollback notes, and final go/no-go decision.

## Acceptance Gate

The sprint is complete only when:

- all four representative roles pass authenticated smoke coverage;
- the PWA installs and launches on the selected pilot devices;
- camera/manual asset identification works within organisation scope;
- online and offline field evidence survives reconnect without duplicates;
- failed sync is visible and recoverable;
- submitted jobs and client data remain correctly scoped;
- the full automated and real-device test record is attached to the freeze decision;
- this document records the final 6/6 pilot freeze.

## Security Rules

- No service-role key or database credential may enter the PWA bundle, test fixtures, or screenshots.
- Pilot accounts must be isolated from production secrets and use least privilege.
- Offline data may be stored locally only as a temporary work queue and must be server-authorized during sync.
- Client A/B and technician assignment boundaries must be verified again after every storage or sync change.

## Explicitly Out Of Scope

- native iOS or Android store packaging;
- guaranteed background sync when the browser is suspended;
- unrestricted offline browsing of clients, sites, or assets;
- automatic technician reassignment;
- new management reporting capabilities.

## Current Status

**Move 6/6: pilot sign-off and release freeze recorded.**

Added explicit Playwright coverage for technician navigation/logout and client-to-technician boundary protection, plus `.env.e2e.example` for local credential setup. The PWA shell now exposes an install action when the browser supports `beforeinstallprompt`, and manifest/service-worker contracts are covered by unit tests.

Real-device acceptance checklist: install from the technician Today route; launch in standalone mode; verify Today, Jobs, Scan, and More at mobile width; deny and then allow camera permission; switch offline and confirm the Offline shell indicator; reconnect and confirm queued work syncs; update the app and confirm the new shell loads.

Move 3 delivery: camera scanning now stops cleanly, avoids post-shutdown scan timers, distinguishes denied permission from unavailable hardware, retries network lookup safely, and exposes recoverable photo-upload and checklist-start errors to technicians.

Move 4 delivery: offline finding/checklist queues now show syncing and failed states, retain failed work for retry, expose retry actions, and reject offline photos over 4 MB before local storage. Server-side idempotency and authorisation remain unchanged. IndexedDB migration for very large photo queues remains a later hardening item.

Move 5 delivery: the technician More screen now exposes a non-sensitive app version, connection state, service-worker readiness, and pending-finding count for pilot support. The application metadata uses the same version source, and support diagnostics never include credentials, tokens, or customer records.

## Freeze Record

- Full unit suite: `24` files, `61` tests passed.
- TypeScript: passed.
- ESLint: passed.
- Production build: passed.
- Browser routing smoke: `14` passed; `5` authenticated tests skipped because pilot credentials were not configured. Assertions completed; the Playwright dev-server teardown required manual termination.
- RLS: unchanged from the previous freeze and last verified at `10/10` boundary checks passed.
- Database migrations: none introduced by this pilot sprint.

## Deferred After Freeze

- Credentialed E2E execution with the four pilot accounts.
- Physical Android/iOS device acceptance and camera testing.
- IndexedDB-backed storage for very large offline photo queues.
- Guaranteed background sync while the browser is suspended.
- Native mobile store packaging.
