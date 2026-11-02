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
- Authenticated technician session verified Today, Jobs, Scan, More, and a technician job-detail route.
- Technician mobile viewport verified at 390×844: no page-level horizontal overflow, filter controls scroll within their own region, and bottom navigation remains usable.
- A real mobile-layout defect was fixed by constraining technician grid content; production deployment `b512f43` is READY and aliased to `fire-man.vercel.app`.
- Local production build passes TypeScript, ESLint, and Next.js build validation.

## Evidence still required

- Button pending-state verification during an authenticated form submission.

## Acceptance limitation

The repository Playwright suite cannot start its configured `webServer` process in this Windows environment, although `npm run start` launches the same production server manually on port 3060. The mobile check used a 390×844 browser viewport rather than a physical handset. Form submission was not triggered against production because the available technician data was already submitted/locked and creating new field data would be an external operational side effect.

## Defects recorded

One mobile overflow defect was found and fixed in `app/globals.css`; production verification passed after deployment `b512f43`. No remaining production route or navigation defect was identified. The only deferred check is a live form-pending observation, which requires an editable pilot job and explicit operational test approval.
