# FAST external backup runbook

## Approved backup choice

FAST selected **decide later** for external scheduled exports. The current pilot continues without an external customer-data export.

## Recommended operating policy

- Destination: not configured.
- Schedule: weekly export every Monday at 2:00 AM Malaysia time, with an additional export before any planned schema or production workflow change.
- Retention: keep the latest 12 weekly exports and the latest 12 monthly snapshots.
- Protection: restrict the folder to FAST management and the approved technical support operator; do not share public tracking links, passwords, service-role keys, or full tracking tokens in the folder.
- Owner: FAST management operator; backup review by Abdul (`SUPERVISOR`) once per month.
- Verification: after each export, confirm that the file exists, can be opened, and includes the export date and project identifier.

## Current state

No external export destination, scheduler, or restore test is configured. Revisit this decision before expanding the portal beyond the controlled pilot.

## Handover record

Record the following when configured:

- destination folder or storage identifier;
- scheduler/job name and timezone;
- first successful export date and size;
- restore-test date and result;
- person who performed the verification.

Never store Supabase service-role keys or customer tracking tokens in the backup runbook or support notes.

