# FireMaint Maintenance Planning & Automation Sprint Lock

## Bismillah

This sprint begins after the completed Operational Control & Management Attention sprint. Its purpose is to turn maintenance visibility into repeatable planning and timely management action.

## Sprint Objective

Automatically plan recurring maintenance work, surface upcoming and overdue risk, notify the right internal users, and give management a usable view of technician workload and maintenance history.

## Scope: Six Moves

1. **Recurring job-generation foundation**
   - Define recurrence rules from active maintenance plans.
   - Generate the next due job idempotently without duplicate work.
   - Preserve client, site, building, asset, technician, and template context.
2. **Planning horizon and job lifecycle**
   - Add next-cycle planning windows.
   - Show planned, generated, skipped, and cancelled outcomes.
   - Keep manual scheduling compatible with automation.
3. **Notifications and escalation rules**
   - Notify internal users about due-soon, overdue, critical, and review-blocked work.
   - Avoid duplicate notifications through stable event keys.
   - Keep clients outside internal operational notifications.
4. **Maintenance history and trend intelligence**
   - Summarise completed work by client, site, plan, frequency, status, and finding severity.
   - Surface repeat failures and unresolved finding ageing.
5. **Technician workload and capacity view**
   - Show assigned workload by technician and date window.
   - Highlight unassigned and overloaded work without changing assignment automatically.
6. **Golden-path acceptance and sprint freeze**
   - Verify recurring generation, notification boundaries, trends, workload visibility, RLS, and idempotency.
   - Freeze the sprint with a completion record.

## Explicitly Deferred

Offline-first field dashboards remain a separate sprint. They require local persistence, sync retries, conflict handling, and device-level testing.

## Security Boundary

Automation must run with organisation isolation, preserve existing role access, avoid service-role exposure in the browser, and make every generated job and notification traceable to its source plan or event.

## Acceptance Gate

The sprint is complete when:

- repeated automation runs do not create duplicate jobs;
- generated jobs remain organisation- and client-scoped;
- notification events are deduplicated and role-scoped;
- trends and capacity views respect RLS;
- existing golden-path tests remain green;
- unit, typecheck, lint, build, integration/RLS, and relevant E2E checks pass;
- this document records the final 6/6 freeze.

## Final Acceptance Record

The six planned moves are complete:

1. Recurring job-generation foundation
2. Planning horizon and job lifecycle
3. Notifications and escalation rules
4. Maintenance history and trend intelligence
5. Technician workload and capacity view
6. Golden-path acceptance and sprint freeze

The implementation preserves organisation-scoped Supabase access, keeps client users outside internal notification creation, and leaves offline-first field operation as a separate future sprint.

## Current Status

**Maintenance Planning & Automation, 6/6: COMPLETE AND FROZEN.**
