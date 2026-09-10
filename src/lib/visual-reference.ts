export const PHOTO_CATEGORIES = [
  "Overall",
  "Front",
  "Rear",
  "Left",
  "Right",
  "Top",
  "Bottom",
  "Label",
  "Connector",
  "Cable Routing",
  "Hardware",
  "Critical Inspection Area",
  "Packaging",
  "Correct Example",
  "Incorrect Example",
  "Other",
] as const;

export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];

export function isPhotoCategory(value: string): value is PhotoCategory {
  return PHOTO_CATEGORIES.includes(value as PhotoCategory);
}

export function safeFileName(name: string) {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);

  return cleaned || "reference-image";
}

export const MAX_REFERENCE_IMAGE_BYTES = 12 * 1024 * 1024;

export function isAllowedImageType(type: string) {
  return ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(type);
}
