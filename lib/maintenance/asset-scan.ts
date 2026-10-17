export function normalizeAssetCode(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}
