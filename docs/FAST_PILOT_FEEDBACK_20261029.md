# FAST pilot feedback — 29 October 2026

## Pilot record

- Request reference: `SR-DB53221D71`
- Customer submitted through the public FAST request page: yes
- Secure tracking link opened successfully: yes
- Initial status shown: Submitted
- Customer-safe timeline shown: yes
- Customer reply form shown: yes
- Real customer data used: yes

## Observed issue and correction

The customer initially attempted to enter the human-readable `SR-` support reference at `/track` and received an invalid-code response. The secure tracking link itself worked correctly. The `/track` page and public tracking function were then updated and redeployed so that both access methods work:

- the `SR-` reference can be entered directly;
- the secure tracking code/link remains supported;
- both access values must remain private.

## Remaining acceptance step

The real-customer pilot journey is now verified:

- FAST published the first customer-safe update and changed the request to **Under review**.
- The customer replied: “Please confirm whether a quotation will be prepared.”
- The reply is visible to FAST and on the customer-facing timeline.
- The public page shows the next action: FAST will confirm the finding details and advise the next inspection or quotation step.

Record any further customer/operator feedback in `FAST_PILOT_FEEDBACK_RECORD.md` without recording the private tracking token. The final decision to expand the pilot remains with FAST.

