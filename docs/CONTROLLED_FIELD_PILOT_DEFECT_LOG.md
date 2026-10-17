# Controlled Field Pilot Defect Log

## Bismillah

| ID | Finding | Classification | Disposition | Status |
| --- | --- | --- | --- | --- |
| CFP-001 | Desktop Chrome offered installation, but the mobile browser did not show an install option. Device, OS, and browser version were not supplied. | Pilot-safe; installation acceptance remains open | Added 192px and 512px PNG manifest icons, Apple touch/browser icons, bumped the service-worker cache, and added browser-specific installation guidance under Technician More. Commit `f859683` was pushed to `main`; verify its Vercel deployment is Ready before retesting. | Fix pushed; physical-device retest pending |

## Retest Record

Record the device model, OS version, browser/version, deployment URL or commit, install result, and standalone launch result. Do not record account credentials or customer data.

| Device / OS | Browser / version | Deployment | Install result | Standalone launch | Date / notes |
| --- | --- | --- | --- | --- | --- |
|  |  |  | Not run | Not run |  |

## Triage Notes

- No claim is made that mobile installation has passed; a physical-device retest is still required.
- The Move 4 interruption and recovery drill remains not run and is an explicit Move 6 go/no-go dependency.
- Add further defects here only with a reproducible observation and sanitized evidence reference.
