import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { AssetScanner } from "@/components/technician/asset-scanner";

export default function TechnicianScanPage() {
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <PageHeader title="Scan asset" description="Identify an assigned asset before starting field work." />
      <Card><AssetScanner /></Card>
    </div>
  );
}
