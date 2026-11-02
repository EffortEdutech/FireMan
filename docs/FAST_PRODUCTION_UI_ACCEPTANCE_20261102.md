# FAST Production UI Acceptance — 2 November 2026

## Release verification

- Vercel project: `fire-man`
- Production alias: `https://fire-man.vercel.app/`
- Production deployment: READY
- Verified application code baseline: `c30adfb` — `Align technician shell with FAST UI system`
- Current production deployment: `9655662` — `Record FAST production UI acceptance` (documentation-only follow-up; application code is unchanged from `c30adfb`).

## Completed checks

- FAST public homepage loads with FAST branding and navigation.
- Public service-request page loads and displays the shared form controls.
- Request-page loading boundary is visible before the page content renders.
- Public tracking page loads and exposes request-reference entry and status action.
- Protected `/dashboard` correctly redirects unauthenticated visitors to `/login`.
- Authenticated FAST owner session reviewed the fixed management sidebar and work-area navigation.
- Dashboard Operations Console verified: queue selection, dense work table, search filtering, selected-record detail, and full-workspace navigation.
- Authenticated Dashboard views verified: Overview, Maintenance intelligence, Maintenance history, Technician workload, and Management attention.
- Authenticated management screens verified after data loading: Service Requests, Maintenance, Reports, Equipment, Clients, Sites, and Report Settings.
- Loading boundaries were observed on slower data-backed routes and cleared after the route finished loading.
- Technician routes correctly redirected the current OWNER session to the management dashboard; a technician-role session is still required to validate the technician shell itself.
- Local production build passes TypeScript, ESLint, and Next.js build validation.

## Evidence still required

- Authenticated technician-role review of Today, Jobs, Scan, and equipment workflow.
- Real-device/mobile visual review of the authenticated management and technician shells.
- Button pending-state verification during an authenticated form submission.

## Acceptance limitation

The available browser session is authenticated as FAST OWNER, which is sufficient for management-screen review but is redirected away from technician-only routes. The repository Playwright suite also cannot start its configured `webServer` process in this Windows environment, although `npm run start` launches the same production server manually on port 3060. Mobile review was limited to the narrow Codex browser viewport; a real device or technician-role session is still needed for full daily-use approval.

## Defects recorded

No production route or interaction defect was identified during this acceptance pass. The remaining items are validation prerequisites (technician-role access, real-device/mobile review, and a safe authenticated form-submission check), not confirmed product defects.
