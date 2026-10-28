# FAST request workflow pilot checklist

## Before enabling public intake

- Apply the migration in a non-production Supabase project first.
- Confirm the FAST organisation is active and has `public_request_enabled = false` until the hosted setup is ready.
- Configure the hosted Auth **Magic Link** template to include `{{ .Token }}` and set the OTP expiry to 10 minutes.
- Configure production SMTP and verify the sender address and FAST branding.
- Add the deployed request URL to Supabase Auth redirect and site URL settings.
- Confirm the deployed host is using the intended FAST Supabase project and environment variables.

## Customer pilot

1. Open `/request` while intake is disabled. The form must explain that online requests are unavailable and must not send an email.
2. Enable intake from the FAST **Service Requests** page.
3. Submit a request with a new email address and confirm the required email code arrives.
4. Enter the code and submit a request with a company and site description.
5. Confirm the requester can see only requests submitted with that verified email.
6. Confirm the requester can send a reply and sees it in timeline order.
7. Sign out and repeat with a second email. Confirm the second requester cannot see or reply to the first request.
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

Record the test date, environment, test email aliases, request references, migration revision, SMTP result, and the final `npm run typecheck`, targeted ESLint, and `npm run build` results. Do not store OTP values or passwords in the evidence.

