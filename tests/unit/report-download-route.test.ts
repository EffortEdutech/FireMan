import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/lib/supabase/types";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  fetchIssuedReportData: vi.fn(),
  getCurrentProfile: vi.fn()
}));

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentProfile: mocks.getCurrentProfile
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient
}));

vi.mock("@/lib/reports/issued-report-data", () => ({
  fetchIssuedReportData: mocks.fetchIssuedReportData
}));

const { GET } = await import("@/app/api/reports/[reportId]/download/route");

function profile(role: Profile["role"]): Profile {
  return {
    active: true,
    client_id: role === "CLIENT" ? "client-1" : null,
    created_at: "2026-10-08",
    full_name: `${role} User`,
    id: `${role.toLowerCase()}-1`,
    organisation_id: "org-1",
    phone: null,
    role,
    updated_at: "2026-10-08"
  };
}

const reportData = {
  report: {
    generatedAt: "2026-10-08",
    id: "report-1",
    issuedAt: "2026-10-08",
    jobId: "job-1",
    reportNumber: "UKB-2026-000004",
    status: "ISSUED",
    title: "Maintenance Report"
  },
  client: {
    name: "Client A"
  },
  site: {
    name: "Client A Demo Site"
  },
  job: {
    jobNumber: "UKB-JOB-20261008-D89B92",
    scheduledDate: "2026-10-08"
  },
  summary: {
    checklistResultCount: 0,
    clientName: "Client A",
    findingCount: 0,
    generatedAt: "2026-10-08",
    issuedAt: "2026-10-08",
    jobNumber: "UKB-JOB-20261008-D89B92",
    scheduledDate: "2026-10-08",
    siteName: "Client A Demo Site"
  },
  assets: [],
  checklistGroups: [],
  findings: [],
  loadErrors: {
    findings: false,
    findingPhotos: false,
    inspectionResults: false,
    inspections: false,
    templateItems: false
  }
};

describe("report download route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ from: vi.fn() });
    mocks.fetchIssuedReportData.mockResolvedValue({ data: reportData, error: null });
  });

  it("rejects unauthenticated requests", async () => {
    mocks.getCurrentProfile.mockResolvedValue(null);

    const response = await GET(new Request("https://app.test/api/reports/report-1/download?format=pdf"), {
      params: Promise.resolve({ reportId: "report-1" })
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthenticated" });
  });

  it("rejects technician requests", async () => {
    mocks.getCurrentProfile.mockResolvedValue(profile("TECHNICIAN"));

    const response = await GET(new Request("https://app.test/api/reports/report-1/download?format=pdf"), {
      params: Promise.resolve({ reportId: "report-1" })
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("returns not found when RLS or report lookup hides the report", async () => {
    mocks.getCurrentProfile.mockResolvedValue(profile("CLIENT"));
    mocks.fetchIssuedReportData.mockResolvedValue({ data: null, error: new Error("Report not found") });

    const response = await GET(new Request("https://app.test/api/reports/report-1/download?format=pdf"), {
      params: Promise.resolve({ reportId: "report-1" })
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Report not found" });
  });

  it("returns a PDF attachment for management users", async () => {
    mocks.getCurrentProfile.mockResolvedValue(profile("OWNER"));

    const response = await GET(new Request("https://app.test/api/reports/report-1/download?format=pdf"), {
      params: Promise.resolve({ reportId: "report-1" })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="UKB-2026-000004.pdf"');
    expect(mocks.fetchIssuedReportData).toHaveBeenCalledWith(expect.anything(), "report-1", {
      issuedOnly: false
    });

    const body = Buffer.from(await response.arrayBuffer()).toString("latin1");
    expect(body.startsWith("%PDF-1.4")).toBe(true);
  });

  it("requires issued reports for client downloads", async () => {
    mocks.getCurrentProfile.mockResolvedValue(profile("CLIENT"));

    await GET(new Request("https://app.test/api/reports/report-1/download?format=pdf"), {
      params: Promise.resolve({ reportId: "report-1" })
    });

    expect(mocks.fetchIssuedReportData).toHaveBeenCalledWith(expect.anything(), "report-1", {
      issuedOnly: true
    });
  });
});
