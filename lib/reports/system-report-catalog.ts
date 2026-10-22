import type { ReportLayoutDefinition, ReportLayoutSection } from "@/lib/reports/report-layout";

/**
 * Catalogue of fire-system report templates.
 *
 * Each template is plain report-layout JSON built from existing block types.
 * Sections carry `options.systemTypes` so a per-system report only prints the
 * assets, checklists and findings of that system, while a combined report has
 * one scoped block per system plus a consolidated deficiency register.
 *
 * Standards are cited by the clients' contracts and differ per job, so each
 * template says the governing standard is the one in the contract. Malaysian MS
 * numbers are listed only where verified (MS 1539, MS 1910); add others per
 * client once confirmed.
 *
 * Keep this file free of runtime imports: the migration generator script loads
 * it with plain Node.
 */

export type ServiceFrequency = "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL" | "FIVE_YEARLY";

export const serviceFrequencyLabels: Record<ServiceFrequency, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  SEMI_ANNUAL: "Semi-Annual",
  ANNUAL: "Annual",
  FIVE_YEARLY: "5-Yearly"
};

export type FireSystemModule = {
  key: string;
  name: string;
  /** Values of the `system_type` enum this module covers. */
  systemTypes: string[];
  standards: string[];
  /** Tasks the visit covers, by frequency. A template is built for each frequency listed. */
  tasks: Partial<Record<ServiceFrequency, string[]>>;
  /** Acceptance criteria stated in the report so the client knows what was judged. */
  acceptance: string[];
  deficiencyClasses: string[];
};

export const fireSystemModules: FireSystemModule[] = [
  {
    key: "fire-alarm",
    name: "Fire Detection and Alarm",
    systemTypes: ["FIRE_ALARM"],
    standards: ["NFPA 72", "BS 5839-1", "UBBL 1984 (fire alarm provisions)", "Fire Services Act 1988"],
    tasks: {
      MONTHLY: [
        "Panel status, fault and disablement log reviewed",
        "Standby battery and mains supply indicators checked",
        "Visual check of control panel, repeaters and annunciators"
      ],
      QUARTERLY: [
        "Functional test of a rotating share of detectors and manual call points, recorded by zone",
        "Sounder and visual alarm operation check",
        "Panel fault, event and disablement log reviewed; open faults reported",
        "Standby battery voltage and charger check"
      ],
      ANNUAL: [
        "Functional test of 100% of detectors, manual call points and sounders, recorded by zone",
        "Detector cleaning or sensitivity check as the detector type requires",
        "Sound level (dB) measured at representative locations",
        "Standby battery load test and charger output",
        "Cause-and-effect and interface tests (lift recall, AHU shutdown, door release, pump or suppression signals)",
        "Panel event log downloaded and reviewed; zone and device labels checked against site plan"
      ]
    },
    acceptance: [
      "Every tested device activates the panel and shows the correct zone and address",
      "Sounders operate in all required areas; sound level recorded in dB at the locations tested",
      "Standby battery supports the supply duration required by the cited standard under load",
      "No unexplained faults, disablements or earth faults at handover"
    ],
    deficiencyClasses: ["Device fault or missing", "Zone disabled", "Battery below rating", "Earth fault", "Sounder inaudible", "Interface failure"]
  },
  {
    key: "sprinkler",
    name: "Automatic Sprinkler",
    systemTypes: ["SPRINKLER"],
    standards: ["NFPA 25", "NFPA 13", "MS 1910 (automatic sprinkler systems)", "UBBL 1984"],
    tasks: {
      MONTHLY: [
        "Control valves confirmed open and sealed or supervised",
        "System and supply pressure gauges read and recorded",
        "Valve room, alarm valve and tank levels visually checked"
      ],
      QUARTERLY: [
        "Main drain test: static and residual pressure recorded",
        "Water-flow alarm and valve tamper switch test",
        "Alarm valve, retard chamber and water motor gong check",
        "Visual inspection of sprinkler heads for damage, paint, corrosion and obstruction"
      ],
      ANNUAL: [
        "All sprinkler heads, pipework, hangers and bracing inspected",
        "Control valves operated through full travel and returned to open",
        "Main drain test and full alarm test",
        "Dry, pre-action or deluge valve trip test where fitted",
        "Spare heads and wrench cabinet checked",
        "Fire department connection and supply tank inspected"
      ]
    },
    acceptance: [
      "All control valves in the open position and supervised or locked",
      "Main drain residual pressure within the tolerance of the static pressure stated in the cited standard",
      "Water-flow alarms sound within the time stated in the cited standard",
      "No heads damaged, painted, corroded or obstructed within the clearance required"
    ],
    deficiencyClasses: ["Obstructed or painted head", "Leaking joint", "Valve closed or unsupervised", "Low pressure", "Corrosion", "Alarm failure"]
  },
  {
    key: "hydrant-riser",
    name: "Hydrant, Riser and Landing Valves",
    systemTypes: ["HYDRANT_RISER"],
    standards: ["NFPA 25", "NFPA 14", "NFPA 24", "UBBL 1984 (hydrants and risers)"],
    tasks: {
      QUARTERLY: [
        "Hydrants, landing valves and cabinets visually inspected",
        "Valve operation and hose, nozzle and coupling condition checked",
        "Signage, caps and accessibility checked"
      ],
      ANNUAL: [
        "Flow and pressure test at the remote and top-most outlets",
        "Hydrant flow test and valve exercise through full travel",
        "Hose, nozzle and cabinet inspection with hose replacement where defective",
        "Riser pipework, supports and drains inspected"
      ],
      FIVE_YEARLY: [
        "Hydrostatic test of riser pipework and hose at the pressure and duration stated in the cited standard",
        "Internal inspection of pipework where required"
      ]
    },
    acceptance: [
      "Outlet pressure and flow recorded and compared with the design or commissioning value",
      "Valves operate freely with no leaks at glands or seats",
      "Hoses free of cracks, kinks and perishing; couplings fully engaged"
    ],
    deficiencyClasses: ["Leaking valve", "Missing cap, hose or nozzle", "Seized valve", "Low flow or pressure", "Cabinet or signage defect"]
  },
  {
    key: "hose-reel",
    name: "Hose Reel",
    systemTypes: ["HOSE_REEL"],
    standards: ["NFPA 25", "UBBL 1984 (hose reels)"],
    tasks: {
      MONTHLY: [
        "Hose reel accessibility and cabinet condition checked",
        "Hose, nozzle, valve and swing arm visually inspected"
      ],
      ANNUAL: [
        "Hose fully unreeled and checked along its length for cracks, kinks and wear",
        "Water flow and nozzle pressure measured at the reel",
        "Isolating valve and nozzle shut-off operation tested",
        "Hose length and age recorded; reels over life replaced"
      ]
    },
    acceptance: [
      "Water flows from the nozzle with pressure and flow recorded",
      "Hose fully extends and retracts without damage; no leaks at connections",
      "Reel reachable and unobstructed"
    ],
    deficiencyClasses: ["Cracked or perished hose", "Blocked nozzle", "Stuck or leaking valve", "Reel obstructed"]
  },
  {
    key: "fire-pump",
    name: "Fire Pump Set",
    systemTypes: ["FIRE_PUMP"],
    standards: ["NFPA 25 (fire pumps)", "NFPA 20", "UBBL 1984"],
    tasks: {
      MONTHLY: [
        "Pump run under load: pressure, current or engine speed, run time recorded",
        "Controller indications, alarms and battery or charger condition checked",
        "Diesel engine fuel, oil, coolant and battery checked where applicable"
      ],
      ANNUAL: [
        "Performance test: churn, rated flow and peak flow pressures recorded against the pump curve",
        "Controller alarms, automatic start and manual start tested",
        "Jockey pump start and stop pressures verified",
        "Suction and discharge valves, relief valve and test header inspected",
        "Water tank level, float and inlet checked"
      ]
    },
    acceptance: [
      "Pump starts automatically and delivers pressure within the tolerance of the nameplate curve",
      "No abnormal vibration, noise, overheating or leaks at the gland",
      "Controller shows no unacknowledged alarms"
    ],
    deficiencyClasses: ["Failed to start", "Low pressure or flow", "Fuel or battery low", "Gland leak", "Controller fault"]
  },
  {
    key: "extinguisher",
    name: "Portable Fire Extinguisher",
    systemTypes: ["FIRE_EXTINGUISHING"],
    standards: ["MS 1539 (portable fire extinguishers)", "NFPA 10", "BS 5306-3", "JBPM e-sticker (eFEIS) requirements where applicable"],
    tasks: {
      MONTHLY: [
        "Extinguisher present, visible, accessible and mounted correctly",
        "Pressure gauge in range, seal and pin intact, no visible damage",
        "Label and instructions legible"
      ],
      ANNUAL: [
        "Full service: external and internal examination, weight or pressure check",
        "Discharge components, hose and nozzle checked",
        "Recharge or refill where required; new seal and service tag fitted",
        "Service date and next-due recorded for each unit"
      ],
      FIVE_YEARLY: [
        "Hydrostatic or cylinder pressure test as required for the extinguisher type",
        "Units over their service life or failing test removed and replaced"
      ]
    },
    acceptance: [
      "Correct extinguisher type and rating for the hazard at each location",
      "Weight or pressure within the nameplate range",
      "Each serviced unit carries a current service tag or sticker"
    ],
    deficiencyClasses: ["Below weight or pressure", "Damaged cylinder or hose", "Missing seal or pin", "Overdue test", "Wrong type for hazard", "Unit missing"]
  },
  {
    key: "emergency-lighting",
    name: "Emergency Lighting and Exit Signs",
    systemTypes: ["EMERGENCY_LIGHTING", "EXIT_SIGNAGE"],
    standards: ["BS 5266-1", "NFPA 101", "UBBL 1984 (emergency lighting and exit signs)"],
    tasks: {
      MONTHLY: [
        "Short function test of each luminaire and exit sign on simulated mains failure",
        "Charge indicators checked; failed or dim units noted"
      ],
      ANNUAL: [
        "Full-duration battery test (1 or 3 hours as designed) with the test log completed",
        "Lux levels checked on escape routes where measured",
        "Batteries and lamps replaced where the test fails",
        "Exit signs illumination and visibility checked along routes"
      ]
    },
    acceptance: [
      "Each luminaire remains lit for the rated duration after mains failure",
      "Exit signs visible and illuminated from the direction of travel",
      "Failed units listed by location with corrective action"
    ],
    deficiencyClasses: ["Short battery duration", "Dead battery", "Lamp or LED failure", "Sign obstructed or unlit"]
  },
  {
    key: "gaseous-suppression",
    name: "Gaseous Suppression",
    systemTypes: ["GASEOUS_SUPPRESSION"],
    standards: ["NFPA 2001", "NFPA 12 (CO2)", "ISO 14520", "UBBL 1984"],
    tasks: {
      MONTHLY: [
        "Control panel, discharge delay and manual release visually checked",
        "Cylinder pressure gauges and valve positions recorded"
      ],
      SEMI_ANNUAL: [
        "Cylinder weight or pressure checked against nameplate",
        "Discharge hoses, nozzles and brackets inspected"
      ],
      ANNUAL: [
        "Detection and release circuit tested without discharge",
        "Actuators, solenoids and pilot lines tested or inspected",
        "Enclosure integrity checked: doors, dampers and penetrations",
        "Hydrostatic test dates and cylinder certification checked"
      ]
    },
    acceptance: [
      "Cylinder charge within nameplate tolerance",
      "Release circuit operates and discharge delay and warning devices function",
      "Protected room shows no new unsealed penetrations"
    ],
    deficiencyClasses: ["Low charge", "Actuator or solenoid fault", "Detection fault", "Unsealed penetration", "Hydro test overdue"]
  },
  {
    key: "foam-suppression",
    name: "Foam Suppression",
    systemTypes: ["FOAM_SUPPRESSION"],
    standards: ["NFPA 11", "NFPA 25 (foam-water systems)", "UBBL 1984"],
    tasks: {
      QUARTERLY: [
        "Foam concentrate tank level and condition checked",
        "Proportioner, pumps and valves inspected"
      ],
      ANNUAL: [
        "Foam concentrate sample tested by the supplier or an approved laboratory",
        "Discharge devices, nozzles and strainers inspected; system flow test where required",
        "Proportioning accuracy checked"
      ]
    },
    acceptance: [
      "Concentrate within shelf life and passes laboratory test",
      "Proportioning within the tolerance of the cited standard",
      "Discharge devices clear and correctly aimed"
    ],
    deficiencyClasses: ["Concentrate failed test", "Low concentrate level", "Blocked strainer or nozzle", "Proportioner fault"]
  },
  {
    key: "passive-protection",
    name: "Fire Doors, Dampers and Compartmentation",
    systemTypes: ["PASSIVE_PROTECTION"],
    standards: ["NFPA 80", "NFPA 101", "UBBL 1984 (compartmentation and fire doors)"],
    tasks: {
      QUARTERLY: [
        "Fire doors checked: closed latching, self-closing, not held open, seals intact",
        "Fire shutters and dampers visually inspected"
      ],
      ANNUAL: [
        "Door gaps, hinges, closers, latches and seals measured and inspected, door by door",
        "Fire damper drop test and reset at accessible dampers",
        "Fire stopping at service penetrations inspected for breaks"
      ]
    },
    acceptance: [
      "Doors close and latch from any open position",
      "Gaps and seals within the limits of the cited standard",
      "Dampers close fully and reset; no breaches in compartment lines"
    ],
    deficiencyClasses: ["Door held open", "Seal or gap defect", "Closer failure", "Damper stuck", "Fire stopping breach"]
  },
  {
    key: "smoke-control",
    name: "Smoke Control and Pressurisation",
    systemTypes: ["SMOKE_CONTROL"],
    standards: ["NFPA 92", "NFPA 204", "BS EN 12101", "UBBL 1984 (smoke control)"],
    tasks: {
      MONTHLY: [
        "Fans started and run; current, vibration and noise recorded",
        "Controller indications and damper positions checked"
      ],
      ANNUAL: [
        "Stair and lobby pressure differentials measured in pascals with doors closed and open",
        "Extract airflow measured at representative zones",
        "Activation by the fire alarm tested through cause-and-effect",
        "Dampers, louvres, belts and motors inspected"
      ]
    },
    acceptance: [
      "Pressure differentials within the range required by the cited standard",
      "Fans reach duty on alarm signal within the required time",
      "Door-opening force within the limit of the cited standard"
    ],
    deficiencyClasses: ["Low pressure differential", "Fan or motor fault", "Damper fault", "Activation failure"]
  }
];

const pageDefinition = {
  size: "A4",
  orientation: "portrait",
  margins: { top: 20, right: 16, bottom: 20, left: 16 }
} as const;

const standardsStatement =
  "Test criteria and acceptance values are those of the standard cited in the client contract. Where the contract is silent, the standards listed are used as technical reference.";

function header(title: string, subtitle: string): ReportLayoutSection {
  return {
    sectionId: "report_header",
    blockType: "header",
    content: { title, subtitle },
    binding: { source: "report", fields: ["reportNumber", "title", "status", "issuedAt"] }
  };
}

function summaryGrid(): ReportLayoutSection {
  return {
    sectionId: "report_summary",
    blockType: "summary_grid",
    content: { title: "Report Summary" },
    binding: { source: "summary", fields: ["clientName", "siteName", "jobNumber", "scheduledDate", "generatedAt", "issuedAt"] },
    options: { columns: 3 }
  };
}

function signOff(): ReportLayoutSection {
  return {
    sectionId: "sign_off",
    blockType: "signature_box",
    content: { title: "Declaration and Sign-off", description: "Prepared for client record and authority inspection filing." },
    binding: {},
    options: { layout: "two_column" }
  };
}

function textSection(sectionId: string, title: string, items: string[], description?: string): ReportLayoutSection {
  return {
    sectionId,
    blockType: "static_text",
    content: { title, ...(description ? { description } : {}) },
    binding: {},
    options: { items }
  };
}

function scopedEvidenceSections(prefix: string, titlePrefix: string, systemTypes: string[]): ReportLayoutSection[] {
  return [
    {
      sectionId: `${prefix}_assets`,
      blockType: "asset_table",
      content: { title: `${titlePrefix}: Serviced Assets` },
      binding: { source: "assets", fields: ["assetCode", "equipmentType", "systemName", "location", "inspectionStatus"] },
      options: { systemTypes }
    },
    {
      sectionId: `${prefix}_checklist`,
      blockType: "checklist_evidence",
      content: { title: `${titlePrefix}: Checklist Results` },
      binding: { source: "checklistGroups", fields: ["assetCode", "checklistName", "status", "items"] },
      options: { systemTypes }
    }
  ];
}

function deficiencySection(prefix: string, title: string, systemTypes?: string[]): ReportLayoutSection {
  return {
    sectionId: `${prefix}_deficiencies`,
    blockType: "field_evidence",
    content: { title },
    binding: { source: "findings", fields: ["title", "severity", "status", "description", "recommendation", "createdAt"] },
    options: { columns: 2, photoRows: 2, showCaptions: true, ...(systemTypes ? { systemTypes } : {}) }
  };
}

export type SystemReportTemplate = {
  slug: string;
  name: string;
  description: string;
  kind: "SYSTEM" | "COMBINED";
  frequency: ServiceFrequency;
  systemTypes: string[];
  layout: ReportLayoutDefinition;
};

export function buildSystemTemplate(module: FireSystemModule, frequency: ServiceFrequency): SystemReportTemplate | null {
  const tasks = module.tasks[frequency];
  if (!tasks) return null;

  const frequencyLabel = serviceFrequencyLabels[frequency];
  const name = `${module.name}: ${frequencyLabel} Service Report`;
  const slug = `${module.key}-${frequency.toLowerCase().replace(/_/g, "-")}`;

  return {
    slug,
    name,
    description: `${frequencyLabel} routine maintenance report for ${module.name.toLowerCase()}: standards, work covered, results and deficiencies for this system only.`,
    kind: "SYSTEM",
    frequency,
    systemTypes: module.systemTypes,
    layout: {
      layoutId: slug,
      name,
      version: "1.0.0",
      locked: false,
      page: pageDefinition,
      sections: [
        header(name, `${module.name} routine maintenance`),
        summaryGrid(),
        textSection("scope_standards", "Scope and Reference Standards", module.standards, standardsStatement),
        textSection("work_covered", `${frequencyLabel} Work Covered`, tasks),
        ...scopedEvidenceSections("system", module.name, module.systemTypes),
        textSection("acceptance_criteria", "Acceptance Criteria Applied", module.acceptance),
        deficiencySection("system", "Deficiencies and Recommendations", module.systemTypes),
        textSection("deficiency_classes", "Deficiency Classification Used", module.deficiencyClasses),
        signOff()
      ]
    }
  };
}

export function buildCombinedTemplate(frequency: ServiceFrequency): SystemReportTemplate | null {
  const modules = fireSystemModules.filter((module) => module.tasks[frequency]);
  if (modules.length === 0) return null;

  const frequencyLabel = serviceFrequencyLabels[frequency];
  const name = `Combined Fire Safety Service Report: ${frequencyLabel}`;
  const slug = `combined-${frequency.toLowerCase().replace(/_/g, "-")}`;
  const standards = Array.from(new Set(modules.flatMap((module) => module.standards)));

  const perSystem = modules.flatMap((module) => [
    textSection(`${module.key}_work`, `${module.name}: Work Covered`, module.tasks[frequency] ?? []),
    ...scopedEvidenceSections(module.key.replace(/-/g, "_"), module.name, module.systemTypes),
    textSection(`${module.key}_acceptance`, `${module.name}: Acceptance Criteria Applied`, module.acceptance)
  ]);

  return {
    slug,
    name,
    description: `${frequencyLabel} visit report across every fire system serviced on the job: one section per system and a consolidated deficiency register.`,
    kind: "COMBINED",
    frequency,
    systemTypes: modules.flatMap((module) => module.systemTypes),
    layout: {
      layoutId: slug,
      name,
      version: "1.0.0",
      locked: false,
      page: pageDefinition,
      sections: [
        header(name, `Systems covered: ${modules.map((module) => module.name).join(", ")}`),
        summaryGrid(),
        textSection("scope_standards", "Scope and Reference Standards", standards, standardsStatement),
        ...perSystem,
        deficiencySection("consolidated", "Consolidated Deficiency Register"),
        signOff()
      ]
    }
  };
}

export function buildSystemReportCatalog(): SystemReportTemplate[] {
  const frequencies: ServiceFrequency[] = ["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL", "FIVE_YEARLY"];
  const templates: SystemReportTemplate[] = [];

  for (const frequency of frequencies) {
    const combined = buildCombinedTemplate(frequency);
    if (combined) templates.push(combined);
    for (const module of fireSystemModules) {
      const template = buildSystemTemplate(module, frequency);
      if (template) templates.push(template);
    }
  }

  return templates;
}
