# Controlled Field Pilot Runbook

## Bismillah

Use this runbook for Moves 3/6 and 4/6. Perform each with an approved pilot client, one assigned technician, one site, one assigned asset, and a job created for the exercise. Use a separate scheduled job for Move 4 if the Move 3 job has already been submitted.

## Before Start

- Confirm `npm run check:pilot` passes.
- Confirm the pilot technician is assigned to the selected job.
- Confirm the selected job has at least one assigned asset with an active checklist template.
- Record the job number, client, site, asset code, and pilot date in the decision log.
- Do not use a production customer record unless explicitly approved.

## Owner Setup

1. Sign in as Owner.
2. Open **Maintenance** and confirm the pilot client, site, asset, and technician.
3. Confirm the job is `SCHEDULED` and has one assigned asset.
4. Record the job number and open the job detail page.

Stop if the job is assigned to the wrong technician, belongs to the wrong client/site, or has no active checklist template.

## Technician Execution

1. Sign in as Technician and open **Today**.
2. Start the assigned job.
3. Open the assigned asset and start its checklist.
4. Complete every checklist item with an intentional result.
5. Capture one finding with a clear title, severity, description, and recommendation.
6. Attach one field photo with a caption.
7. Complete the asset checklist.
8. Confirm the job evidence count and checklist status.
9. Submit the job for management review.

Stop if an unassigned job or asset is visible, a submitted job remains editable, or evidence is linked to another job.

## Management Review

1. Sign in as Owner.
2. Open **Maintenance** and the pilot job.
3. Confirm the job is ready for review and the finding/photo/checklist evidence is present.
4. Start review, close the review, and generate the report shell.
5. Verify the selected report template and evidence sections.
6. Mark the report reviewed and issue it.
7. Record the report number and download HTML/PDF output.

Stop if the report contains another client/site/job, loses the finding photo, or omits checklist results.

## Client Verification

1. Sign in as the matching pilot client.
2. Open the issued report.
3. Confirm the report number, site, finding, photo evidence, checklist results, and issue date.
4. Sign in as the other client and confirm the pilot report is not visible.

## Evidence To Record

- job number;
- asset code;
- finding title and severity;
- report number;
- issued report screenshot or exported file location;
- device/browser used by the technician;
- any interruption or recovery observed;
- defects classified as blocking, pilot-safe, or deferred.

## Completion Criteria

The supervised job passes only when the same evidence can be followed from technician capture to the issued client report, with no cross-client visibility and no duplicate records.

## Move 4: Interruption and Recovery Drill

### Supported behavior to verify

- Starting a job, starting an asset checklist, and submitting a job require a working connection.
- The **Offline recovery** panel queues checklist results and findings in this device's local storage.
- An offline finding can include one photo up to 4 MB and an optional caption.
- Queued items should remain visible after refresh and should be removed from the pending list only after the server accepts the sync.
- Replaying a checklist result targets the same inspection item; replaying a finding uses its saved ID. Verify the resulting server records directly in the job UI before continuing.

This drill is not a test of unrestricted offline app use. Do not begin it until the technician has started the job and its asset inspection while online.

### Prepare

1. Confirm Move 3's job has been completed, or create a separate scheduled drill job with an assigned asset and active checklist template.
2. Sign in as the assigned technician while connected and start the job and asset inspection.
3. Open the job detail page and confirm the checklist is in progress.
4. Record the job ID, job number, asset code, device, browser/PWA mode, and start time in the drill log.

Stop if the job or inspection cannot be started while connected, or if the current user is not the assigned technician.

### Checklist interruption

1. Turn on airplane mode or disable the device network.
2. In **Offline recovery**, select a checklist item and save a result. Record the item and result.
3. Refresh the job page while still offline.
4. Confirm the queued checklist result remains visible and is not represented as a server-saved result yet.
5. Restore connectivity and wait for sync. If sync reports failure, use **Retry failed sync** once the connection is stable.
6. Confirm the result appears exactly once in the assigned asset checklist and the pending item disappears.

### Finding and photo interruption

1. Disable the device network.
2. In **Offline recovery**, save one uniquely titled finding with severity, description, a photo smaller than 4 MB, and a caption.
3. Refresh the page while still offline and confirm the queued finding remains visible.
4. Restore connectivity and allow automatic sync. If sync fails, retry after confirming the device is online.
5. Confirm exactly one matching finding appears on the job and exactly one photo with the expected caption is attached.
6. Refresh the job page and confirm the finding and photo remain present, with no pending copy left in the queue.

### Failed sync and retry

1. Queue a second uniquely titled finding while offline.
2. Restore connectivity briefly, then interrupt the connection while the pending sync is being attempted. Record the visible status and any error message.
3. Restore a stable connection and use **Retry failed sync** if the item remains queued.
4. Confirm exactly one server finding is present and that the queue clears only after successful sync.
5. Do not repeatedly press retry while a request is still pending. If the result is ambiguous, refresh the job and inspect persisted evidence before retrying.

### Closeout

1. Confirm there are no queued checklist results or findings for the drill job.
2. Confirm all expected checklist, finding, and photo evidence appears once on the job.
3. Keep the drill job in progress until the checks pass. Submit it only after the queue is empty and the persisted evidence has been reviewed.
4. Record each scenario as **Pass**, **Fail**, or **Not run**, including observed and expected counts, screenshots or record IDs, and any defect severity.

The drill passes only when queued evidence survives refresh, failed sync can be retried, synced records appear once, and no evidence is lost or attached to another job. Any duplicate, missing, cross-job, or cross-client evidence is a release-blocking failure.

### Drill Log

| Scenario | Device / mode | Expected | Observed | Result | Evidence / issue |
| --- | --- | --- | --- | --- | --- |
| Checklist offline, refresh, reconnect |  | One result, one persisted checklist result |  | Not run |  |
| Finding plus photo offline, refresh, reconnect |  | One finding, one photo, expected caption |  | Not run |  |
| Failed sync, retry |  | Pending item retained until accepted, one server record |  | Not run |  |

Record the drill job number and date here: ____________________
