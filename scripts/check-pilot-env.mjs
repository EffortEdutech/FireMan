import { createRequire } from "node:module";

const { loadEnvConfig } = createRequire(import.meta.url)("@next/env");
loadEnvConfig(process.cwd());

const required = [
  ["E2E_OWNER_EMAIL", "owner email"],
  ["E2E_OWNER_PASSWORD", "owner password"],
  ["E2E_TECHNICIAN_EMAIL", "technician email"],
  ["E2E_TECHNICIAN_PASSWORD", "technician password"],
  ["E2E_CLIENT_A_EMAIL", "Client A email"],
  ["E2E_CLIENT_A_PASSWORD", "Client A password"],
  ["E2E_CLIENT_B_EMAIL", "Client B email"],
  ["E2E_CLIENT_B_PASSWORD", "Client B password"]
];

const missing = required.filter(([name]) => !process.env[name]).map(([, label]) => label);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
else if (!/^https:\/\//.test(url)) missing.push("NEXT_PUBLIC_SUPABASE_URL (must use https)");

if (missing.length) {
  console.error("Pilot environment is not ready. Missing or invalid values:");
  for (const item of missing) console.error(`- ${item}`);
  console.error("Set these in the local shell or .env.local (git-ignored); never commit or share pilot credentials.");
  process.exit(1);
}

console.log("Pilot environment is ready.");
console.log("- Four role credential pairs detected (values redacted)");
console.log(`- Supabase URL: ${url}`);
console.log("- No credentials were printed or persisted by this check.");

