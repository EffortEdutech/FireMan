# FAST external backup runbook

## Approved backup choice

FAST selected **external scheduled exports** for the FireMan/Supabase production records.

## Recommended operating policy

- Destination: Google Drive folder [FAST Portal Backups](https://drive.google.com/drive/folders/1PnijRJwmWF1BpAwX9FydWUBFZ7nW8gEb), created in the connected Drive account.
- Schedule: weekly export every Monday at 2:00 AM Malaysia time, with an additional export before any planned schema or production workflow change.
- Retention: keep the latest 12 weekly exports and the latest 12 monthly snapshots.
- Protection: restrict the folder to FAST management and the approved technical support operator; do not share public tracking links, passwords, service-role keys, or full tracking tokens in the folder.
- Owner: FAST management operator; backup review by Abdul (`SUPERVISOR`) once per month.
- Verification: after each export, confirm that the file exists, can be opened, and includes the export date and project identifier.

## Current state

The external destination folder now exists. No Supabase export scheduler or completed restore test has been connected yet. Those steps must be configured and tested before production handover is marked complete.

## Handover record

Record the following when configured:

- destination folder or storage identifier;
- scheduler/job name and timezone;
- first successful export date and size;
- restore-test date and result;
- person who performed the verification.

Never store Supabase service-role keys or customer tracking tokens in the backup runbook or support notes.

