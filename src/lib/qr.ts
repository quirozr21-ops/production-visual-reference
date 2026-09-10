export function buildPermanentProductUrl(appUrl: string, partNumber: string): string {
  const base = appUrl.trim().replace(/\/+$/, "");
  const part = partNumber.trim();
  if (!base) throw new Error("Application URL is required");
  if (!part) throw new Error("Part number is required");
  return `${base}/p/${encodeURIComponent(part)}`;
}
