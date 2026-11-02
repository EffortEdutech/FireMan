# FAST Equipment Taxonomy and Scope Approval

Status: Goal 15 working scope — ready for FAST technical review

## Purpose

Define a stable, searchable equipment catalogue for FAST before adding new database records or inspection templates. This catalogue covers the building fire-protection systems that FAST is expected to inspect, maintain, service, quote, and report.

This is a taxonomy document. It does not change Supabase data or claim that every listed system is approved for every project. The applicable Malaysian authority requirements, contract requirements, manufacturer listing, and project design remain the controlling references.

## Existing baseline

The current repository already contains these reference equipment types:

- Dry powder and CO₂ extinguishers
- Hose reel
- Fire alarm panel, smoke/heat detector, manual call point and sounder
- Emergency light and exit sign
- Sprinkler head
- Hydrant/landing valve
- Fire pump set
- Sprinkler control valve set

The application already recognises broader system groups for gaseous suppression, foam suppression, passive protection, and smoke control. The missing work is the detailed equipment catalogue, technical fields, inspection templates, and component relationships for those systems.

## Current implementation gap

The current `public.system_type` enum supports the original groups plus `HYDRANT_RISER`, `FIRE_PUMP`, `GASEOUS_SUPPRESSION`, `FOAM_SUPPRESSION`, `PASSIVE_PROTECTION`, and `SMOKE_CONTROL`. The following proposed families still require a later schema migration before they can be used as first-class system records:

- `WATER_SPRAY_MIST`
- `CO2_SUPPRESSION`
- `KITCHEN_SUPPRESSION`
- `EMERGENCY_LIFE_SAFETY`
- `SPECIAL_HAZARD`

This is intentionally deferred to Goal 16. Goal 15 approves the vocabulary and boundaries first; Goal 16 will add enum values, seed records, and compatibility checks in a controlled migration.

## Approved system-family code set

| Family code | Family | Scope |
| --- | --- | --- |
| `FIRE_ALARM` | Fire alarm and detection | Detection, alarm, control, notification and interfaces |
| `SPRINKLER` | Automatic sprinkler | Wet, dry, pre-action and sprinkler control assemblies |
| `HYDRANT_RISER` | Hydrant, riser and hose reel | Landing valves, hydrants, hose reels and inlets |
| `FIRE_PUMP` | Fire pumps and water supply | Pumps, controllers, tanks and pump-room equipment |
| `WATER_SPRAY_MIST` | Water spray and water mist | Fixed spray, deluge-water and water-mist systems |
| `GASEOUS_SUPPRESSION` | Clean-agent suppression | FK-5-1-12, HFC, inert-gas and releasing systems |
| `CO2_SUPPRESSION` | Carbon-dioxide suppression | CO₂ cylinders, release systems and safety interfaces |
| `FOAM_SUPPRESSION` | Foam, deluge and monitor | Foam concentrate, proportioning, discharge and monitors |
| `KITCHEN_SUPPRESSION` | Commercial kitchen suppression | Wet-chemical hood and cooking-equipment systems |
| `FIRE_EXTINGUISHING` | Portable and wheeled extinguishers | Portable, wheeled and specialised extinguishers |
| `PASSIVE_PROTECTION` | Passive fire protection | Fire doors, dampers, shutters, barriers and fire stopping |
| `SMOKE_CONTROL` | Smoke control and pressurisation | Fans, dampers, controls and pressure systems |
| `EMERGENCY_LIFE_SAFETY` | Emergency lighting and evacuation | Emergency lights, exit signs, voice evacuation and intercom |
| `SPECIAL_HAZARD` | Special-hazard systems | Aerosol, hybrid, battery and other engineered systems |

## Equipment-type catalogue

### `FIRE_ALARM`

`FAP-STD` Fire alarm control panel; `FAP-REP` repeater/annunciator panel; `DET-SMOKE` smoke detector; `DET-HEAT` heat detector; `DET-BEAM` beam detector; `DET-ASP` aspirating detector; `DET-FLAME` flame detector; `DET-GAS` gas detector; `MCP-STD` manual call point; `SND-STD` sounder; `STB-STD` visual strobe; `MOD-MON` monitor module; `MOD-CTRL` control module; `ISO-STD` isolator; `PSU-FA` fire-alarm power supply; `BAT-FA` standby battery; `EVAC-PNL` voice-evacuation panel.

### `SPRINKLER`

`SPR-STD` sprinkler head; `SPR-VLV` sprinkler control/alarm valve set; `SPR-FLOW` water-flow switch; `SPR-PRES` pressure switch; `SPR-TEST` test-and-drain assembly; `SPR-DV` deluge/pre-action valve; `SPR-FDC` fire department connection; `SPR-GAUGE` system gauge; `SPR-AUX` auxiliary drain; `SPR-PIPE` sprinkler pipework/zone assembly.

### `HYDRANT_RISER`

`HYD-LV` landing valve; `HYD-OUT` hydrant outlet; `HYD-CAB` hydrant cabinet; `HYD-FDC` breeching inlet; `HYD-HOSE` fire hose; `HR-STD` hose reel; `HR-NOZ` hose-reel nozzle; `HR-CAB` hose-reel cabinet; `PRV-FIRE` fire-system pressure-reducing valve.

### `FIRE_PUMP`

`PMP-ELEC` electric fire pump; `PMP-DIESEL` diesel fire pump; `PMP-JOCKEY` jockey pump; `PMP-CTRL` fire-pump controller; `PMP-TEST` pump test header/flow meter; `TANK-FIRE` fire-water tank; `TANK-BREAK` break tank; `PMP-RELIEF` circulation/relief valve; `PMP-BATT` diesel pump battery/charger.

### `WATER_SPRAY_MIST`

`WS-DV` water-spray deluge valve; `WS-NOZ` water-spray nozzle; `WS-MON` water-spray monitor; `WM-PUMP` water-mist pump; `WM-NOZ` water-mist nozzle; `WM-TANK` water-mist tank; `WM-CTRL` water-mist control panel; `WM-ACC` water-mist accumulator/pressure vessel.

### `GASEOUS_SUPPRESSION`

`GAS-CTRL` releasing/control panel; `GAS-CYL` agent cylinder; `GAS-MAN` cylinder manifold; `GAS-SEL` selector valve; `GAS-NOZ` discharge nozzle; `GAS-PIPE` discharge pipework; `GAS-DET` detection device; `GAS-MREL` manual release station; `GAS-ABORT` abort switch; `GAS-WARN` warning beacon/sounder; `GAS-PRES` pressure switch; `GAS-HVAC` HVAC/electrical shutdown interface; `GAS-VENT` pressure-relief vent; `GAS-ROOM` protected-room integrity record.

### `CO2_SUPPRESSION`

`CO2-CYL` CO₂ cylinder; `CO2-MAN` CO₂ manifold; `CO2-SEL` selector valve; `CO2-NOZ` discharge nozzle; `CO2-CTRL` release/control panel; `CO2-MREL` manual release; `CO2-ABORT` abort/lockout station; `CO2-WARN` pre-discharge warning device; `CO2-VENT` ventilation/safety interlock; `CO2-PIPE` discharge pipework.

### `FOAM_SUPPRESSION`

`FOAM-TANK` foam concentrate tank; `FOAM-BLADDER` bladder tank; `FOAM-PUMP` foam pump; `FOAM-PROP` proportioner; `FOAM-CHAMBER` foam chamber; `FOAM-POURER` foam pourer; `FOAM-MAKER` foam maker; `FOAM-NOZ` foam nozzle; `FOAM-MON` foam monitor; `FOAM-DV` foam deluge valve; `FOAM-CONC` foam concentrate; `FOAM-TEST` proportioning/flow test assembly.

### `KITCHEN_SUPPRESSION`

`KITCHEN-CTRL` kitchen suppression panel; `KITCHEN-CYL` wet-chemical cylinder; `KITCHEN-LINK` fusible-link/linear detection; `KITCHEN-PULL` manual pull station; `KITCHEN-NOZ` discharge nozzle; `KITCHEN-PIPE` agent pipework; `KITCHEN-GAS` gas shutoff interface; `KITCHEN-ELEC` electrical shutoff interface; `KITCHEN-INT` cooking-equipment interlock; `KITCHEN-HOOD` extraction hood; `KITCHEN-FILTER` grease filter; `KITCHEN-DUCT` exhaust duct; `KITCHEN-FAN` exhaust fan.

### `FIRE_EXTINGUISHING`

`EXT-DP` dry powder extinguisher; `EXT-CO2` CO₂ extinguisher; `EXT-WATER` water extinguisher; `EXT-FOAM` foam extinguisher; `EXT-WET` wet-chemical extinguisher; `EXT-CLEAN` clean-agent extinguisher; `EXT-AERO` aerosol extinguisher; `EXT-WHEEL` wheeled extinguisher; `EXT-CAB` extinguisher cabinet.

### `PASSIVE_PROTECTION`

`PASS-DOOR` fire door; `PASS-GLAZE` fire-rated glazing; `PASS-DAMPER` fire/smoke damper; `PASS-SHUTTER` fire shutter; `PASS-CURTAIN` fire curtain; `PASS-STOP` fire stopping/penetration seal; `PASS-BARRIER` fire-rated barrier or compartment wall.

### `SMOKE_CONTROL`

`SMK-FAN` smoke-extract fan; `SMK-PRESS` stair/lobby pressurisation fan; `SMK-DAMPER` smoke-control damper; `SMK-PANEL` smoke-control panel; `SMK-PRES` pressure sensor; `SMK-LVR` smoke-control louvre; `SMK-CURTAIN` smoke curtain; `SMK-INT` fire-alarm cause-and-effect interface.

### `EMERGENCY_LIFE_SAFETY`

`EML-STD` emergency light; `EXIT-STD` exit sign; `EML-CB` central-battery system; `EML-INV` emergency-lighting inverter; `EVAC-PNL` voice-evacuation panel; `EVAC-SPK` voice-evacuation speaker; `INT-FIRE` fireman intercom; `INT-REFUGE` refuge-area communication point.

### `SPECIAL_HAZARD`

`AERO-CTRL` fixed-aerosol control unit; `AERO-GEN` aerosol generator; `HYB-CTRL` hybrid suppression controller; `HYB-UNIT` hybrid water/inert-gas unit; `BESS-DET` battery-energy-storage detection; `BESS-SUP` battery-energy-storage suppression; `TRANS-DET` transformer/fire-gas detection.

## Priority packages for implementation

1. Clean-agent, gaseous and CO₂ systems
2. Foam, deluge and monitor systems
3. Commercial kitchen suppression
4. Water spray and water mist
5. Fire alarm expansion and voice evacuation
6. Passive fire protection and smoke control
7. Special-hazard systems

## Scope boundaries

- A system is not the same as a component. A protected system must be able to contain many component assets.
- Standards and editions must be stored as references on the system or checklist; they must not be treated as universal compliance rules inside the equipment name.
- Technical values must be recorded from the approved design, manufacturer data, test certificate, contract, or authority requirement.
- Customer views expose safe asset identity, location, status, approved documents and service history only.
- Internal notes, pricing, staff findings and unrestricted technical data remain staff-only.
- New equipment types should be added through migrations and reviewed seed data, not manually created as inconsistent names.

## FAST technical approval checklist

- [ ] FAST confirms the family names used by its technicians.
- [ ] FAST confirms the equipment types it actually services.
- [ ] FAST confirms Malaysian terminology, abbreviations and spelling.
- [ ] FAST identifies equipment types that require separate inspection templates.
- [ ] FAST confirms which technical fields are customer-visible.
- [ ] FAST confirms which systems require certificates, expiry dates or laboratory evidence.
- [ ] FAST confirms the priority implementation order.

## Approval decision required

FAST should approve or amend these three decisions before Goal 16 starts:

1. Use the family codes and equipment-type codes in this document as the canonical reference catalogue.
2. Implement the priority packages in this order: clean-agent/CO₂, foam/deluge/monitor, kitchen suppression, then the remaining families.
3. Keep system records separate from component equipment records, with each component linked to its parent system and protected hazard.

## Reference basis

- NFPA official standards catalogue: https://www.nfpa.org/for-professionals/codes-and-standards/list-of-codes-and-standards
- NFPA 11, foam systems: https://www.nfpa.org/codes-and-standards/nfpa-11-standard-development/11
- NFPA 17A, wet-chemical systems: https://www.nfpa.org/codes-and-standards/nfpa-17a-standard-for-wet-chemical-extinguishing-systems/17A
- NFPA 96, commercial cooking operations: https://www.nfpa.org/product/nfpa-96-standard/p0096code?l=77
- JBPM eFEIS FAQ: https://efeis.bomba.gov.my/storage/front/document/2tkFY0PBRpXtX0jWkq5W6qAFdlOELGGFk4iPib8o.pdf
