# FireMaint Operational Control Sprint Lock

## Bismillah

This sprint expands FireMaint beyond report generation into an operational control surface for management.

## Sprint Objective

Give management one organisation-scoped dashboard that shows current workload, actionable attention queues, and scheduled-maintenance intelligence, with direct links into existing workflows.

## Six-Move Scope

1. **Operational KPI foundation**
   - Added typed KPI loading for jobs, reports, clients, sites, and findings.
   - Added due-next-30-days and overdue job signals.
2. **Management attention queues**
   - Added overdue jobs, submitted jobs awaiting review, critical findings, and reviewed reports ready to issue.
3. **Scheduled maintenance intelligence**
   - Added overdue, next-7-day, days-8-to-30, and days-31-to-90 windows.
   - Added oldest-overdue ageing and maintenance-frequency mix.
4. **Dashboard experience and workflow polish**
   - Added a management attention summary, section hierarchy, compact action links, and responsive dashboard layout.
5. **Security, performance, and test hardening**
   - Added organisation/status/date indexes for dashboard reads.
   - Added queue and schedule error-path tests.
6. **Golden-path acceptance and sprint freeze**
   - Verified the complete automated test/build/lint/typecheck gate.
   - Recorded this lock as the authoritative completion record.

## Acceptance Gate

The sprint is accepted when all of the following pass:

- `npm run test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `git diff --check`
- unauthenticated route smoke tests
- existing RLS golden-boundary test remains available for remote database verification

## Security Boundary

Dashboard reads use the existing authenticated Supabase server client. No service-role key, public bypass, new view, or policy relaxation was introduced. Existing organisation and role RLS policies remain the source of truth.

## Deferred Work

- richer charts and historical trend lines
- recurring-job generation automation
- notifications and escalation delivery
- staffing/capacity planning
- offline operational dashboards

These are separate capability moves and are not blockers for this sprint.

## Freeze Decision

**Operational Control & Management Attention, 6/6 moves: COMPLETE.**

The next sprint must be explicitly scoped before implementation begins.
