# FireMaint Controlled Field Pilot Sprint Lock

## Bismillah

This sprint moves FireMaint from automated readiness into a controlled field pilot with representative users, real devices, and one complete maintenance job lifecycle.

## Sprint Objective

Prove that FireMaint can support a small supervised pilot without compromising role boundaries, field evidence, report integrity, offline recovery, or operational supportability.

## Starting Reality

The following sprints are frozen:

- Technician PWA & Field Workflow: Move 6/6 complete.
- Technician Pilot & Production Readiness: Move 6/6 complete.
- Operational Control and Maintenance Planning: frozen with automated acceptance gates.

The product currently has:

- Owner, technician, Client A, and Client B roles;
- assigned maintenance jobs and asset-linked checklists;
- findings, photos, reports, PDF/HTML/JSON output;
- custom report templates;
- offline finding/checklist queues with retry states;
- RLS isolation and automated routing coverage.

## Scope: Six Moves

### Move 1/6: Pilot account and environment readiness

- Configure four non-committed pilot account credential pairs.
- Verify role, organisation, client, site, asset, and technician assignments.
- Confirm pilot data is identifiable and does not rely on accidental production records.

### Move 2/6: Real-device field acceptance

- Install and launch the PWA on selected Android and iOS devices.
- Test camera permission, QR/manual asset lookup, mobile navigation, and offline shell.
- Record device/browser results and reproduction details for every defect.

### Move 3/6: Complete supervised maintenance job

- Assign a job to the pilot technician.
- Start the job, complete the asset checklist, capture a finding and photo, and submit it.
- Review the job, generate and issue the report, then verify the client portal result.

### Move 4/6: Interruption and recovery drill

- Interrupt connectivity during checklist, finding, and photo capture.
- Reconnect and verify synchronization without duplicate evidence.
- Test failed sync recovery and confirm support diagnostics are sufficient.

### Move 5/6: Pilot defect triage and workflow polish

- Classify findings as release-blocking, pilot-safe, or deferred.
- Fix only defects that affect safety, data integrity, access control, or the golden path.
- Preserve a short pilot decision log with screenshots or record identifiers where appropriate.

### Move 6/6: Go/no-go decision and release freeze

- Re-run unit, typecheck, lint, build, E2E, RLS, and pilot acceptance gates.
- Confirm rollback and support contacts.
- Record the pilot decision, known limitations, and next product sprint.

## Acceptance Gate

The sprint is complete only when:

- all four pilot roles authenticate and land in the correct experience;
- one real job completes from assignment through issued client report;
- asset checklist, finding, photo, and report evidence remain linked;
- offline interruption recovery produces no duplicates;
- Client A and Client B remain isolated;
- technician access remains assignment-scoped;
- all release-blocking defects are closed or explicitly accepted;
- this document records the final go/no-go decision.

## Security Rules

- Pilot credentials must remain outside Git and screenshots.
- Do not use service-role credentials in browser or device testing.
- Do not use customer data unless explicitly approved for the pilot.
- Reset or archive pilot data after the exercise according to the project policy.
- Any RLS failure is an automatic no-go until resolved and re-tested.

## Explicitly Out Of Scope

- broad customer onboarding;
- native app-store distribution;
- guaranteed background sync;
- large-scale performance benchmarking;
- new reporting capabilities unrelated to pilot defects;
- unrestricted offline browsing.

## Current Status

**Move 1/6: pilot account and environment readiness complete.**

`npm run check:pilot` passed with all four role credential pairs and the HTTPS Supabase URL. Authenticated Playwright acceptance passed all `19/19` tests, covering Owner, Technician, Client A, Client B, technician route/logout behavior, and Client A technician-route isolation. Credentials remain external to the repository.

E2E acceptance uses the production server (`npm run start`) rather than the development HMR server to avoid cross-origin HMR interference during pilot verification.

**Move 2/6: real-device field acceptance prepared.**

Added mobile Playwright smoke coverage for Pixel 5 and iPhone 13 viewports. The checks cover the login shell, manifest start URL, and offline shell. Physical acceptance still requires installing the PWA on the selected Android/iOS pilot devices and recording camera, standalone, offline, reconnect, and update results.

Next: complete the physical-device checklist, then proceed to Move 3/6, complete supervised maintenance job.

Move 3 runbook: [`CONTROLLED_FIELD_PILOT_RUNBOOK.md`](./CONTROLLED_FIELD_PILOT_RUNBOOK.md).

**Move 3/6: supervised maintenance job runbook ready.**

The executable procedure is captured in the runbook. The actual supervised run remains a human acceptance activity: no pilot job, finding, photo, checklist, or report records were created or mutated by this documentation move. After the run passes, record the job and report identifiers in the pilot decision log before opening Move 4/6.

**Move 4/6: interruption and recovery drill prepared.**

The runbook now covers checklist queueing, finding and photo queueing, refresh persistence, reconnect, failed sync retry, duplicate checks, and closeout. The drill has not been executed. Run it with an in-progress assigned job; create a separate drill job if the supervised job is already submitted. Record the device and observed record counts in the runbook's drill log. Move 4 passes only after the log records all scenarios and the pending queues are empty.
