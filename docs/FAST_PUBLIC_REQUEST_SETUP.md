# FAST public request intake

The public request form uses a required email address but does not require Supabase email OTP, a FAST `profiles` row, a portal password, or an application registration flow. After submission, the requester receives a secure tracking reference and link. The reference authorizes access to that request's customer-safe status, timeline, and replies.

## Enable intake

An OWNER, ADMIN, or SUPERVISOR can enable or disable intake from **Service Requests** in the FAST staff area. Only one organisation can have public intake enabled per Supabase project. The database selects the enabled organisation inside the request RPC; callers cannot choose another tenant ID.

When a public request first arrives, company and site are captured as requester-provided text. FAST staff should verify those details and associate the request with the correct client and site in the staff request screen. Once associated, those links are locked. The public tracking reference must be treated as private because anyone holding it can view and reply to that request.

## Access and public-data boundary

The current pilot intentionally does not send verification email. Anonymous visitors can submit through the public intake function and receive a tracking reference. Anonymous visitors cannot query the request tables directly. Public tracking responses expose only customer-safe fields and public-visible events/replies; staff notes, internal pricing, and unrelated requests remain unavailable.

