# FAST equipment onboarding runbook

## Import order

1. Confirm client, site, building, system, and equipment-type codes before loading assets.
2. Populate one row per physical asset using `FAST_EQUIPMENT_IMPORT_TEMPLATE.csv`.
3. Use approved `equipment_type_code` values from the Equipment catalogue.
4. Complete the required technical fields for that equipment type in `technical_data_json`.
5. Keep customer-visible documents and fields separate from internal notes.
6. Validate the first batch before loading the remaining register.

## Required identity fields

`asset_code`, `equipment_type_code`, `client_name`, `site_name`, `building_name`, `location_description`, and `status` are required for onboarding. Use `serial_number`, `manufacturer`, `model`, `capacity`, and `installation_date` whenever available.

## Technical data rules

`technical_data_json` must contain valid JSON. Field names must match the approved template for the selected equipment type. Required fields are enforced by the equipment registration workflow.

## Document references

Record the source filename or document reference in `document_references` before uploading certificates, manuals, drawings, photos, or inspection reports to the equipment record.

## Pilot batch acceptance

- Start with 5–10 representative assets across different system families.
- Confirm each asset appears in the staff Equipment register.
- Open each asset detail page and verify technical data, documents, QR label, and maintenance links.
- Confirm customer users see only customer-visible fields and documents.
- After acceptance, load the remaining FAST register in batches.

