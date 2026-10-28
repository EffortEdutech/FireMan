# FAST public request intake

The public request form uses Supabase email OTP. Requesters do not need a FAST `profiles` row, a portal password, or an application registration flow. Supabase Auth creates or reuses a passwordless authentication identity so the verified session can be tied to that requester. RLS then limits that identity to its own public requests and replies.

## Enable intake

An OWNER, ADMIN, or SUPERVISOR can enable or disable intake from **Service Requests** in the FAST staff area. Only one organisation can have public intake enabled per Supabase project. The database selects the enabled organisation inside the request RPC; callers cannot choose another tenant ID.

When a public request first arrives, company and site are captured as requester-provided text. FAST staff should verify those details and associate the request with the correct client and site in the staff request screen. Once associated, those links are locked.

## Email delivery

Local Supabase Auth uses `supabase/templates/magic_link.html` to send the six-digit code expected by the request UI. Configure a production SMTP provider for the hosted Supabase project and set its **Magic Link** email template to include `{{ .Token }}`. The production template is configured in Supabase Auth settings; changing the repository's local `config.toml` does not update hosted settings.

The app intentionally grants no anonymous table access to requests, events, or replies. Anonymous visitors can only call the boolean intake-enabled function and request an OTP. Request creation, reading, and replies require the verified Supabase session and are scoped by RLS.

