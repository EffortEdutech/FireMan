import { findReadingDefinition, formatReading, standardUnitFor, units } from "@/lib/reports/readings";
import { buildTrendSeries, changeSinceLastVisit, formatChange, type ReadingPoint, type TrendPoint } from "@/lib/reports/trends";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReportLayoutDefinition } from "@/lib/reports/report-layout";
import { resolveReportLayout } from "@/lib/reports/report-template";
import type { Database } from "@/lib/supabase/database.types";

type ReportStatus = Database["public"]["Enums"]["report_status"];

type ReportRow = {
  id: string;
  job_id: string;
  report_number: string;
  title: string | null;
  status: ReportStatus;
  generated_at: string | null;
  issued_at: string | null;
  template_id: string | null;
  report_templates: {
    name: string;
    layout: Database["public"]["Tables"]["report_templates"]["Row"]["layout"];
  } | null;
  maintenance_jobs: {
    job_number: string;
    scheduled_date: string;
    clients: {
      name: string;
    } | null;
    sites: {
      name: string;
    } | null;
  } | null;
};

type FindingRow = {
  id: string;
  equipment_id?: string | null;
  title: string;
  severity: string;
  status: string;
  description: string | null;
  recommendation: string | null;
  created_at: string;
};

type FindingPhotoRow = {
  id: string;
  finding_id: string;
  storage_path: string;
  caption: string | null;
  taken_at: string | null;
  created_at: string;
};

type JobEquipmentRow = {
  id: string;
  equipment_id?: string | null;
  equipment: {
    asset_code: string;
    location_description: string | null;
    equipment_types: {
      name: string;
    } | null;
    systems: {
      name: string;
      system_type?: string | null;
    } | null;
  } | null;
};

type InspectionRow = {
  id: string;
  job_equipment_id: string;
  template_id: string;
  status: string;
  inspection_templates: {
    name: string;
  } | null;
};

type TemplateItemRow = {
  id: string;
  template_id: string;
  prompt: string;
  sort_order: number;
};

type InspectionResultRow = {
  id: string;
  inspection_id: string;
  template_item_id: string;
  result_status: string | null;
  value_number?: number | null;
  reading_unit?: string | null;
  semantic_key?: string | null;
  value_standard?: number | null;
};

type HistoryJobEquipmentRow = {
  id: string;
  equipment_id: string;
  job_id: string;
  maintenance_jobs: { scheduled_date: string } | { scheduled_date: string }[] | null;
};

/** All recorded readings for these assets across visits, keyed by equipment + semantic key. */
async function loadReadingHistory(supabase: SupabaseClient<Database>, equipmentIds: string[]) {
  const history = new Map<string, ReadingPoint[]>();
  if (equipmentIds.length === 0) return history;

  const { data: jeData, error: jeError } = await supabase
    .from("job_equipment")
    .select("id,equipment_id,job_id,maintenance_jobs(scheduled_date)")
    .in("equipment_id", equipmentIds);
  const jeRows = (jeData ?? []) as unknown as HistoryJobEquipmentRow[];
  if (jeError || jeRows.length === 0) return history;

  const { data: inspData, error: inspError } = await supabase
    .from("inspections")
    .select("id,job_equipment_id")
    .in("job_equipment_id", jeRows.map((row) => row.id));
  const inspRows = (inspData ?? []) as { id: string; job_equipment_id: string }[];
  if (inspError || inspRows.length === 0) return history;

  const { data: resData, error: resError } = await supabase
    .from("inspection_results")
    .select("inspection_id,semantic_key,value_standard")
    .in("inspection_id", inspRows.map((row) => row.id))
    .not("semantic_key", "is", null)
    .not("value_standard", "is", null);
  if (resError) return history;

  const jeById = new Map(jeRows.map((row) => [row.id, row]));
  const jeByInspection = new Map(inspRows.map((row) => [row.id, jeById.get(row.job_equipment_id)]));

  (resData ?? []).forEach((row) => {
    const result = row as { inspection_id: string; semantic_key: string | null; value_standard: number | null };
    const je = jeByInspection.get(result.inspection_id);
    const job = Array.isArray(je?.maintenance_jobs) ? je?.maintenance_jobs[0] : je?.maintenance_jobs;
    if (!je || !job || !result.semantic_key || result.value_standard == null) return;
    const key = `${je.equipment_id}:${result.semantic_key}`;
    history.set(key, [
      ...(history.get(key) ?? []),
      { jobId: je.job_id, visitDate: job.scheduled_date, valueStandard: Number(result.value_standard) }
    ]);
  });

  return history;
}

function readingTextFor(result?: InspectionResultRow) {
  return result && result.value_number != null && result.reading_unit
    ? formatReading(result.value_number, result.reading_unit)
    : null;
}

function readingTrendFor(
  equipmentId: string | null,
  semanticKey: string | null,
  jobId: string,
  history: Map<string, ReadingPoint[]>
) {
  const definition = semanticKey ? findReadingDefinition(semanticKey) : undefined;
  const points = equipmentId && semanticKey ? history.get(`${equipmentId}:${semanticKey}`) : undefined;
  if (!definition || !semanticKey || !points) return {};
  return {
    readingChange: formatChange(semanticKey, changeSinceLastVisit(points, jobId)),
    trend: buildTrendSeries(points),
    trendUnit: units[standardUnitFor[definition.quantity]].label
  };
}

export type IssuedReportFinding = {
  id: string;
  /** System type of the asset the finding was raised on; used to scope template sections. */
  systemType?: string | null;
  title: string;
  severity: string;
  status: string;
  description: string | null;
  recommendation: string | null;
  createdAt: string;
  photos: IssuedReportFindingPhoto[];
  correctiveRepairs?: {
    id: string;
    workOrderNumber: string;
    repairNotes: string;
    partsUsed: string | null;
    completedAt: string;
    verificationNotes: string;
    verifiedAt: string;
    photos: IssuedReportFindingPhoto[];
  }[];
};

export type IssuedReportFindingPhoto = {
  id: string;
  storagePath: string;
  signedUrl: string | null;
  caption: string | null;
  takenAt: string | null;
  createdAt: string;
};

export type IssuedReportAsset = {
  id: string;
  assetCode: string;
  equipmentType: string;
  systemName: string;
  systemType?: string | null;
  location: string;
  inspectionStatus: string;
};

export type IssuedReportChecklistGroup = {
  id: string;
  systemType?: string | null;
  assetCode: string;
  checklistName: string;
  status: string;
  items: {
    id: string;
    prompt: string;
    resultStatus: string | null;
    readingText?: string | null;
    /** Change against the previous visit, in the standard unit. */
    readingChange?: string | null;
    /** Readings across visits (standard unit), oldest first; chart when two or more. */
    trend?: TrendPoint[];
    trendUnit?: string | null;
  }[];
};

export type IssuedReportData = {
  report: {
    id: string;
    jobId: string;
    reportNumber: string;
    title: string | null;
    status: ReportStatus;
    templateId: string | null;
    templateName: string;
    generatedAt: string | null;
    issuedAt: string | null;
  };
  client: {
    name: string;
  };
  site: {
    name: string;
  };
  job: {
    jobNumber: string;
    scheduledDate: string;
  };
  summary: {
    clientName: string;
    siteName: string;
    jobNumber: string;
    scheduledDate: string;
    generatedAt: string | null;
    issuedAt: string | null;
    findingCount: number;
    checklistResultCount: number;
  };
  assets: IssuedReportAsset[];
  findings: IssuedReportFinding[];
  checklistGroups: IssuedReportChecklistGroup[];
  layout: ReportLayoutDefinition;
  loadErrors: {
    findings: boolean;
    findingPhotos: boolean;
    correctiveWorkOrders: boolean;
    inspections: boolean;
    templateItems: boolean;
    inspectionResults: boolean;
  };
};

type FetchIssuedReportDataOptions = {
  issuedOnly?: boolean;
};

export async function fetchIssuedReportData(
  supabase: SupabaseClient<Database>,
  reportId: string,
  options: FetchIssuedReportDataOptions = {}
) {
  let reportQuery = supabase
    .from("reports")
    .select(
      "id,job_id,report_number,title,status,generated_at,issued_at,template_id,report_templates(name,layout),maintenance_jobs(job_number,scheduled_date,clients(name),sites(name))"
    )
    .eq("id", reportId);

  if (options.issuedOnly) {
    reportQuery = reportQuery.eq("status", "ISSUED");
  }

  const { data: reportResult, error: reportError } = await reportQuery.single();
  const report = reportResult as ReportRow | null;

  if (reportError || !report) {
    return {
      data: null,
      error: reportError ?? new Error("Report not found")
    };
  }

  const { data: findingsResult, error: findingsError } = await supabase
    .from("findings")
    .select("id,equipment_id,title,severity,status,description,recommendation,created_at")
    .eq("job_id", report.job_id)
    .order("created_at", { ascending: false });

  const { data: jobEquipmentResult } = await supabase
    .from("job_equipment")
    .select("id,equipment_id,equipment(asset_code,location_description,equipment_types(name),systems(name,system_type))")
    .eq("job_id", report.job_id)
    .order("created_at", { ascending: true });

  const findings = (findingsResult ?? []) as FindingRow[];
  const findingIds = findings.map((finding) => finding.id);
  const { data: findingPhotosResult, error: findingPhotosError } =
    findingIds.length > 0
      ? await supabase
          .from("finding_photos")
          .select("id,finding_id,storage_path,caption,taken_at,created_at")
          .in("finding_id", findingIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };

  const { data: correctiveOrdersResult, error: correctiveOrdersError } = findingIds.length > 0
    ? await supabase
        .from("corrective_work_orders")
        .select("id,work_order_number,finding_id,status,repair_notes,parts_used,repair_completed_at,verification_notes,verified_at")
        .in("finding_id", findingIds)
        .eq("status", "VERIFIED")
        .order("verified_at", { ascending: true })
    : { data: [], error: null };
  const correctiveOrders = correctiveOrdersResult ?? [];
  const correctiveOrderIds = correctiveOrders.map((order) => order.id);
  const { data: correctivePhotosResult, error: correctivePhotosError } = correctiveOrderIds.length > 0
    ? await supabase
        .from("corrective_work_order_photos")
        .select("id,corrective_work_order_id,finding_id,storage_path,caption,created_at")
        .in("corrective_work_order_id", correctiveOrderIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  const correctivePhotos = correctivePhotosResult ?? [];
  const correctivePhotoUrlByPath = new Map<string, string>();
  let correctivePhotoUrlError = false;
  await Promise.all(correctivePhotos.map(async (photo) => {
    const { data: signedPhoto, error: signedPhotoError } = await supabase.storage
      .from("corrective-repair-photos")
      .createSignedUrl(photo.storage_path, 60 * 60);
    if (signedPhotoError) {
      correctivePhotoUrlError = true;
    } else if (signedPhoto?.signedUrl) {
      correctivePhotoUrlByPath.set(photo.storage_path, signedPhoto.signedUrl);
    }
  }));
  const correctivePhotosByOrderId = new Map<string, IssuedReportFindingPhoto[]>();
  correctivePhotos.forEach((photo) => {
    const current = correctivePhotosByOrderId.get(photo.corrective_work_order_id) ?? [];
    correctivePhotosByOrderId.set(photo.corrective_work_order_id, [...current, {
      id: photo.id,
      storagePath: photo.storage_path,
      signedUrl: correctivePhotoUrlByPath.get(photo.storage_path) ?? null,
      caption: photo.caption,
      takenAt: null,
      createdAt: photo.created_at
    }]);
  });
  const correctiveOrdersByFindingId = new Map<string, typeof correctiveOrders>();
  correctiveOrders.forEach((order) => {
    const current = correctiveOrdersByFindingId.get(order.finding_id) ?? [];
    correctiveOrdersByFindingId.set(order.finding_id, [...current, order]);
  });

  const findingPhotos = (findingPhotosResult ?? []) as FindingPhotoRow[];
  const signedPhotoUrlByPath = new Map<string, string>();
  let signedPhotoUrlError = false;

  await Promise.all(
    findingPhotos.map(async (photo) => {
      const { data: signedPhoto, error: signedPhotoError } = await supabase.storage
        .from("inspection-photos")
        .createSignedUrl(photo.storage_path, 60 * 60);

      if (signedPhotoError) {
        signedPhotoUrlError = true;
        return;
      }

      if (signedPhoto?.signedUrl) {
        signedPhotoUrlByPath.set(photo.storage_path, signedPhoto.signedUrl);
      }
    })
  );

  const photosByFindingId = new Map<string, IssuedReportFindingPhoto[]>();

  findingPhotos.forEach((photo) => {
    const current = photosByFindingId.get(photo.finding_id) ?? [];
    photosByFindingId.set(photo.finding_id, [
      ...current,
      {
        id: photo.id,
        storagePath: photo.storage_path,
        signedUrl: signedPhotoUrlByPath.get(photo.storage_path) ?? null,
        caption: photo.caption,
        takenAt: photo.taken_at,
        createdAt: photo.created_at
      }
    ]);
  });

  const jobEquipment = (jobEquipmentResult ?? []) as JobEquipmentRow[];
  const jobEquipmentIds = jobEquipment.map((asset) => asset.id);
  const { data: inspectionsResult, error: inspectionsError } =
    jobEquipmentIds.length > 0
      ? await supabase
          .from("inspections")
          .select("id,job_equipment_id,template_id,status,inspection_templates(name)")
          .in("job_equipment_id", jobEquipmentIds)
      : { data: [], error: null };

  const inspections = (inspectionsResult ?? []) as InspectionRow[];
  const inspectionIds = inspections.map((inspection) => inspection.id);
  const templateIds = inspections.map((inspection) => inspection.template_id);
  const [{ data: templateItemsResult, error: templateItemsError }, { data: inspectionResultsResult, error: resultsError }] =
    await Promise.all([
      templateIds.length > 0
        ? supabase
            .from("inspection_template_items")
            .select("id,template_id,prompt,sort_order")
            .in("template_id", templateIds)
            .order("sort_order", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      inspectionIds.length > 0
        ? supabase
            .from("inspection_results")
            .select("id,inspection_id,template_item_id,result_status,value_number,reading_unit,semantic_key,value_standard")
            .in("inspection_id", inspectionIds)
        : Promise.resolve({ data: [], error: null })
    ]);

  const templateItems = (templateItemsResult ?? []) as TemplateItemRow[];
  const inspectionResults = (inspectionResultsResult ?? []) as InspectionResultRow[];
  const assetById = new Map(jobEquipment.map((asset) => [asset.id, asset]));
  const itemsByTemplateId = new Map<string, TemplateItemRow[]>();
  const resultByInspectionAndItem = new Map<string, InspectionResultRow>();
  const inspectionStatusByAssetId = new Map<string, string>();

  templateItems.forEach((item) => {
    const current = itemsByTemplateId.get(item.template_id) ?? [];
    itemsByTemplateId.set(item.template_id, [...current, item]);
  });

  inspections.forEach((inspection) => {
    inspectionStatusByAssetId.set(inspection.job_equipment_id, inspection.status);
  });

  inspectionResults.forEach((result) => {
    resultByInspectionAndItem.set(`${result.inspection_id}:${result.template_item_id}`, result);
  });

  const systemTypeByEquipmentId = new Map<string, string | null>();
  jobEquipment.forEach((asset) => {
    if (asset.equipment_id) {
      systemTypeByEquipmentId.set(asset.equipment_id, asset.equipment?.systems?.system_type ?? null);
    }
  });

  const readingHistory = await loadReadingHistory(
    supabase,
    Array.from(new Set(jobEquipment.map((asset) => asset.equipment_id).filter((id): id is string => Boolean(id))))
  );

  const checklistGroups = inspections.map((inspection) => {
    const asset = assetById.get(inspection.job_equipment_id);
    const checklistItems = itemsByTemplateId.get(inspection.template_id) ?? [];

    return {
      id: inspection.id,
      systemType: asset?.equipment?.systems?.system_type ?? null,
      assetCode: asset?.equipment?.asset_code ?? "Asset",
      checklistName: inspection.inspection_templates?.name ?? "Checklist",
      status: inspection.status,
      items: checklistItems.map((item) => ({
        id: item.id,
        prompt: item.prompt,
        resultStatus: resultByInspectionAndItem.get(`${inspection.id}:${item.id}`)?.result_status ?? null,
        readingText: readingTextFor(resultByInspectionAndItem.get(`${inspection.id}:${item.id}`)),
        ...readingTrendFor(
          asset?.equipment_id ?? null,
          resultByInspectionAndItem.get(`${inspection.id}:${item.id}`)?.semantic_key ?? null,
          report.job_id,
          readingHistory
        )
      }))
    };
  });

  const clientName = report.maintenance_jobs?.clients?.name ?? "Not set";
  const siteName = report.maintenance_jobs?.sites?.name ?? "Not set";
  const jobNumber = report.maintenance_jobs?.job_number ?? "Not set";
  const scheduledDate = report.maintenance_jobs?.scheduled_date ?? "Not set";
  const data: IssuedReportData = {
    report: {
      id: report.id,
      jobId: report.job_id,
      reportNumber: report.report_number,
      title: report.title,
      status: report.status,
      templateId: report.template_id,
      templateName: report.report_templates?.name ?? "Standard Maintenance Report",
      generatedAt: report.generated_at,
      issuedAt: report.issued_at
    },
    client: {
      name: clientName
    },
    site: {
      name: siteName
    },
    job: {
      jobNumber,
      scheduledDate
    },
    summary: {
      clientName,
      siteName,
      jobNumber,
      scheduledDate,
      generatedAt: report.generated_at,
      issuedAt: report.issued_at,
      findingCount: findings.length,
      checklistResultCount: inspectionResults.length
    },
    assets: jobEquipment.map((asset) => ({
      id: asset.id,
      assetCode: asset.equipment?.asset_code ?? "Asset",
      equipmentType: asset.equipment?.equipment_types?.name ?? "Not set",
      systemName: asset.equipment?.systems?.name ?? "Not set",
      systemType: asset.equipment?.systems?.system_type ?? null,
      location: asset.equipment?.location_description ?? "Not set",
      inspectionStatus: inspectionStatusByAssetId.get(asset.id) ?? "Not started"
    })),
    findings: findings.map((finding) => ({
      id: finding.id,
      systemType: finding.equipment_id ? systemTypeByEquipmentId.get(finding.equipment_id) ?? null : null,
      title: finding.title,
      severity: finding.severity,
      status: finding.status,
      description: finding.description,
      recommendation: finding.recommendation,
      createdAt: finding.created_at,
      photos: photosByFindingId.get(finding.id) ?? [],
      correctiveRepairs: (correctiveOrdersByFindingId.get(finding.id) ?? []).flatMap((order) => {
        if (!order.repair_notes || !order.repair_completed_at || !order.verification_notes || !order.verified_at) return [];
        return [{
          id: order.id,
          workOrderNumber: order.work_order_number,
          repairNotes: order.repair_notes,
          partsUsed: order.parts_used,
          completedAt: order.repair_completed_at,
          verificationNotes: order.verification_notes,
          verifiedAt: order.verified_at,
          photos: correctivePhotosByOrderId.get(order.id) ?? []
        }];
      })
    })),
    checklistGroups,
    layout: resolveReportLayout(report.report_templates?.layout),
    loadErrors: {
      findings: Boolean(findingsError),
      findingPhotos: Boolean(findingPhotosError || signedPhotoUrlError),
      correctiveWorkOrders: Boolean(correctiveOrdersError || correctivePhotosError || correctivePhotoUrlError),
      inspections: Boolean(inspectionsError),
      templateItems: Boolean(templateItemsError),
      inspectionResults: Boolean(resultsError)
    }
  };

  return {
    data,
    error: null
  };
}
