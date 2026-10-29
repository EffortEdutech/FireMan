# FAST pilot operations and production handover

## Purpose

This guide defines the operating procedure for FAST staff during the first controlled customer pilot. It applies to requests submitted through the public FAST request page and tracked with a private request reference/link.

## Staff roles

- OWNER, ADMIN, and SUPERVISOR: review requests, match clients/sites, publish customer-safe status updates, and send FAST replies.
- TECHNICIAN: receives work through the existing technician workflow; does not manage public request status unless FAST intentionally changes the role policy.
- CLIENT: sees only the existing client-portal records permitted for that account.

### Current pilot roster

The live FAST organization currently has:

- UK Bina — OWNER and management operator;
- Kamal Abd Latif — TECHNICIAN;
- Client A and Client B — CLIENT test accounts.

Approved backup operator:

- Abdul — SUPERVISOR — `abdul@fireman.test`.

The Abdul Auth account is confirmed, active, and assigned to FAST as `SUPERVISOR`. Confirm whether the existing test client accounts should remain active.

### Approved FAST operating information

- Phone: `03 4458 605`
- Email: `fast@fireman.test`
- Office: `NO 2, Jalan 5, KL`
- Description: FAST provides fire-protection inspection, maintenance, service-request, quotation, and follow-up support for building owners, property managers, and main contractors.
- Operating hours: Monday–Friday, 9:00 AM–5:00 PM Malaysia time
- Normal response target: Within 1 business day
- Urgent escalation: FAST duty manager / approved emergency contact — Mr Man Ager

### Backup decision

FAST selected **decide later** for external scheduled exports. The current pilot continues without an external customer-data export. Revisit the backup destination, export contents, encryption/retention policy, scheduler, and restore test before expanding the portal beyond the controlled pilot.

See [FAST_BACKUP_RUNBOOK.md](./FAST_BACKUP_RUNBOOK.md) for the recommended schedule, retention, access, and restore-verification procedure.

## Request handling procedure

1. Open **Service Requests** and review the requester name, email, company, site description, category, urgency, and details.
2. Treat `URGENT` as a priority for human review, but never promise emergency response through the public form.
3. Verify the supplied company and site against FAST records.
4. Match the request to the correct client and site when confirmed. Do not force a match when the information is incomplete.
5. Publish only information suitable for the customer timeline. Never include internal notes, margin, private pricing, staff commentary, or another customer's information.
6. Use the next-action field to tell the customer what FAST will do next.
7. Reply through the staff reply form when the customer needs a direct answer.
8. Close or decline only when the reason is clear and the appropriate status transition is available.

## Status guidance

| Status | Use when |
| --- | --- |
| Submitted | FAST has received the request and has not triaged it yet. |
| Under review | FAST is checking scope, site, or client matching. |
| Information needed | FAST needs a customer answer before progressing. |
| Site visit to arrange | A visit is needed before scope or quotation can be confirmed. |
| Quotation being prepared | FAST is preparing the quotation scope. |
| Awaiting your decision | FAST has issued the next customer decision point. |
| Ready to schedule / Scheduled | The work is ready for scheduling or has a confirmed slot. |
| Work in progress | Delivery has started. |
| Completed / Closed | Work is finished and the request is administratively complete. |
| Cancelled / Declined / Unable to proceed | FAST cannot continue; explain the customer-safe reason. |

## Customer reply standard

Use clear, factual language. Include the current action and expected next step. Do not disclose internal deliberation or unapproved prices. If a message contains sensitive information, move the conversation to FAST's approved private channel and avoid repeating the sensitive details in the public timeline.

## Tracking-reference handling

The tracking reference/link is the customer's access credential for this pilot. Do not place it in public posts, shared screenshots, or ordinary email distribution lists. If a customer loses it, FAST should use its normal service-channel verification process; staff must not expose another request's link.

## Pilot support record

For each pilot issue, record only:

- request reference (not the private tracking token);
- date/time in Malaysia time;
- affected page or action;
- browser/device and deployment commit, when relevant;
- observed result and next action.

Never record passwords, OTPs, service-role keys, or full tracking tokens in support notes.

## Handover acceptance

Before expanding beyond the controlled pilot, FAST should confirm one real request from submission through closure, review the customer-visible timeline, and record any changes needed to the status wording, response targets, or monthly support scope.

## Monthly support handover

The monthly support review should cover:

1. request volume by category and urgency;
2. open requests and requests waiting for customer information;
3. overdue or stalled requests and their next actions;
4. customer-visible status wording and reply quality;
5. failed submissions, rate-limit events, and invalid tracking attempts;
6. staff access changes and inactive accounts;
7. deployment, database, and backup health;
8. approved content or workflow changes for the next month.

The support report should use request references and summary counts. Do not include full tracking tokens, passwords, OTPs, service-role keys, or unnecessary personal data.

## Security and resilience review

- Public request creation is limited to five requests per requester email in a rolling hour.
- Public replies are limited to twenty replies per request in a rolling hour.
- Tracking tokens are normalized to 24 hexadecimal characters and are not exposed through direct table access.
- The public tracking function returns only customer-safe request fields and rows marked public-visible.
- The anonymous database role has no direct grants on service requests, events, or replies.
- The `is_public_request_intake_enabled()` RPC is intentionally callable by anonymous visitors so `/request` can display the availability state. It is a narrowly scoped `SECURITY DEFINER` function with an empty search path and returns only a boolean; it must not be expanded to return organization or request data.
- Supabase security advisors currently also report leaked-password protection disabled. This is relevant to staff/client password accounts and should be enabled before broader account rollout.
- The FireMan Supabase organization is currently on the Free plan. Confirm the available backup/restore capability and define an external export or upgrade plan before FAST relies on the portal for production records.

