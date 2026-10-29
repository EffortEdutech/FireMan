# FAST request workflow pilot checklist

## Before enabling public intake

- Apply the migration in a non-production Supabase project first.
- Confirm the FAST organisation is active and has `public_request_enabled = false` until the hosted setup is ready.
- Confirm the approved pilot uses public tracking references; email OTP and SMTP are not required for this version.
- Confirm the public tracking page and invalid-reference response are live before enabling intake.
- Confirm the deployed host is using the intended FAST Supabase project and environment variables.

## Customer pilot

1. Open `/request` while intake is disabled. The form must explain that online requests are unavailable and must not send an email.
2. Enable intake from the FAST **Service Requests** page.
3. Submit a request with a required email address and confirm a secure tracking reference is returned.
4. Open the tracking link and confirm the customer-safe status and timeline are visible without registration.
5. Confirm the requester can send a reply using the tracking token and sees it in timeline order.
6. Open an invalid tracking reference and confirm the response is 404 with no request data.
7. Confirm the tracking reference is treated as private and is not published in public content.
8. Ask FAST staff to open the request, verify the supplied company/site details, and associate the request with the matching client and site.
9. Confirm the association is visible to FAST staff and cannot be replaced after it is made.
10. Publish a status update and confirm the requester sees the status, message, next action, waiting reason, and appointment only when supplied.
11. Send a FAST reply and confirm it appears as a FAST team reply to the requester.
12. Disable intake and confirm new submissions stop while existing verified request access remains available.

## Staff pilot

- Confirm staff can see the public requester identity and supplied site text before matching.
- Confirm only management roles can update request status or publish customer updates.
- Confirm technicians do not receive management update controls unless FAST changes that policy intentionally.
- Confirm corrective quote requests continue using the separate finding-linked workflow.
- Confirm customer replies are visible to FAST staff without exposing internal notes.

## Acceptance evidence

Record the test date, environment, synthetic pilot email aliases, request references, tracking-link result, migration revision, and the final `npm run typecheck`, targeted ESLint, and `npm run build` results. Do not store tracking tokens, passwords, or service-role credentials in the evidence.

