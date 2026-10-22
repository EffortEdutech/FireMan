"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type SiteOption = {
  id: string;
  name: string;
  clientName: string;
};

type BuildingOption = {
  id: string;
  name: string;
  siteName: string;
  clientName: string;
};

type SystemOption = {
  id: string;
  buildingId: string;
  name: string;
  buildingName: string;
};

type EquipmentTypeOption = {
  id: string;
  name: string;
  code: string;
};

type EquipmentFormsProps = {
  createBuildingAction: (formData: FormData) => void | Promise<void>;
  createEquipmentAction: (formData: FormData) => void | Promise<void>;
  createSystemAction: (formData: FormData) => void | Promise<void>;
  buildings: BuildingOption[];
  equipmentTypes: EquipmentTypeOption[];
  sites: SiteOption[];
  systems: SystemOption[];
};

const fieldStyle = {
  minHeight: 44,
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: 12
};

const systemTypes = [
  ["FIRE_ALARM", "Fire alarm"],
  ["FIRE_EXTINGUISHING", "Fire extinguishing"],
  ["HOSE_REEL", "Hose reel"],
  ["SPRINKLER", "Sprinkler"],
  ["EMERGENCY_LIGHTING", "Emergency lighting"],
  ["EXIT_SIGNAGE", "Exit signage"],
  ["HYDRANT_RISER", "Hydrant / riser"],
  ["FIRE_PUMP", "Fire pump"],
  ["GASEOUS_SUPPRESSION", "Gaseous suppression"],
  ["FOAM_SUPPRESSION", "Foam suppression"],
  ["PASSIVE_PROTECTION", "Passive protection (doors, dampers)"],
  ["SMOKE_CONTROL", "Smoke control"],
  ["OTHER", "Other"]
];

export function EquipmentForms({
  createBuildingAction,
  createEquipmentAction,
  createSystemAction,
  buildings,
  equipmentTypes,
  sites,
  systems
}: EquipmentFormsProps) {
  const [systemBuildingId, setSystemBuildingId] = useState("");
  const [equipmentBuildingId, setEquipmentBuildingId] = useState("");

  const buildingSystems = useMemo(
    () => systems.filter((system) => system.buildingId === equipmentBuildingId),
    [equipmentBuildingId, systems]
  );
  const canCreateBuilding = sites.length > 0;
  const canCreateSystem = buildings.length > 0;
  const canCreateEquipment = equipmentBuildingId.length > 0 && equipmentTypes.length > 0;

  return (
    <>
      <section>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>Create building</h2>
        <form action={createBuildingAction} style={{ display: "grid", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <select aria-label="Site" disabled={!canCreateBuilding} name="site_id" required style={fieldStyle}>
              <option value="">{canCreateBuilding ? "Select site" : "Create a site first"}</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.clientName} - {site.name}
                </option>
              ))}
            </select>
            <input aria-label="Building name" disabled={!canCreateBuilding} name="name" placeholder="Building name" required style={fieldStyle} />
            <input aria-label="Building code" disabled={!canCreateBuilding} name="code" placeholder="Building code" style={fieldStyle} />
            <input aria-label="Floors" disabled={!canCreateBuilding} min={1} name="floors" placeholder="Floors" style={fieldStyle} type="number" />
            <input aria-label="Building description" disabled={!canCreateBuilding} name="description" placeholder="Description" style={fieldStyle} />
          </div>
          <div>
            <Button disabled={!canCreateBuilding} type="submit">
              Create Building
            </Button>
          </div>
        </form>
      </section>

      <section>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>Create system</h2>
        <form action={createSystemAction} style={{ display: "grid", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <select
              aria-label="Building"
              disabled={!canCreateSystem}
              name="building_id"
              onChange={(event) => setSystemBuildingId(event.target.value)}
              required
              style={fieldStyle}
              value={systemBuildingId}
            >
              <option value="">{canCreateSystem ? "Select building" : "Create a building first"}</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.clientName} - {building.siteName} - {building.name}
                </option>
              ))}
            </select>
            <select aria-label="System type" disabled={!systemBuildingId} name="system_type" required style={fieldStyle}>
              {systemTypes.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input aria-label="System name" disabled={!systemBuildingId} name="name" placeholder="System name" required style={fieldStyle} />
            <input aria-label="System code" disabled={!systemBuildingId} name="code" placeholder="System code" style={fieldStyle} />
            <input aria-label="System description" disabled={!systemBuildingId} name="description" placeholder="Description" style={fieldStyle} />
          </div>
          <div>
            <Button disabled={!systemBuildingId} type="submit">
              Create System
            </Button>
          </div>
        </form>
      </section>

      <section>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>Register equipment</h2>
        <form action={createEquipmentAction} style={{ display: "grid", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <select
              aria-label="Equipment building"
              disabled={buildings.length === 0 || equipmentTypes.length === 0}
              name="building_id"
              onChange={(event) => setEquipmentBuildingId(event.target.value)}
              required
              style={fieldStyle}
              value={equipmentBuildingId}
            >
              <option value="">{buildings.length > 0 ? "Select building" : "Create a building first"}</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.clientName} - {building.siteName} - {building.name}
                </option>
              ))}
            </select>
            <select aria-label="System" disabled={!equipmentBuildingId || buildingSystems.length === 0} name="system_id" style={fieldStyle}>
              <option value="">
                {!equipmentBuildingId ? "Select building first" : buildingSystems.length > 0 ? "No system selected" : "Create a system for this building first"}
              </option>
              {buildingSystems.map((system) => (
                <option key={system.id} value={system.id}>
                  {system.name} - {system.buildingName}
                </option>
              ))}
            </select>
            <select aria-label="Equipment type" disabled={!canCreateEquipment} name="equipment_type_id" required style={fieldStyle}>
              <option value="">{equipmentTypes.length > 0 ? "Select equipment type" : "Seed equipment types first"}</option>
              {equipmentTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.code})
                </option>
              ))}
            </select>
            <input aria-label="Asset code" disabled={!canCreateEquipment} name="asset_code" placeholder="Asset code" required style={fieldStyle} />
            <input aria-label="Serial number" disabled={!canCreateEquipment} name="serial_number" placeholder="Serial number" style={fieldStyle} />
            <input aria-label="Brand" disabled={!canCreateEquipment} name="brand" placeholder="Brand" style={fieldStyle} />
            <input aria-label="Model" disabled={!canCreateEquipment} name="model" placeholder="Model" style={fieldStyle} />
            <input aria-label="Capacity" disabled={!canCreateEquipment} name="capacity" placeholder="Capacity" style={fieldStyle} />
            <input aria-label="Location description" disabled={!canCreateEquipment} name="location_description" placeholder="Location" style={fieldStyle} />
            <input aria-label="Installation date" disabled={!canCreateEquipment} name="installation_date" style={fieldStyle} type="date" />
          </div>
          <div>
            <Button disabled={!canCreateEquipment} type="submit">
              Register Equipment
            </Button>
          </div>
        </form>
      </section>
    </>
  );
}
