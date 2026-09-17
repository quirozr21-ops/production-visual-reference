import convert from "heic-convert";

function isHeicOrHeif(name: string, type: string) {
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    /\.(heic|heif)$/i.test(name)
  );
}

function jpegFileName(name: string) {
  const withoutExtension = name.replace(/\.(heic|heif)$/i, "");
  return `${withoutExtension || "reference-image"}.jpg`;
}

export async function normalizeReferenceImage(file: File) {
  const originalBytes = new Uint8Array(await file.arrayBuffer());

  if (!isHeicOrHeif(file.name, file.type)) {
    return {
      bytes: originalBytes,
      fileName: file.name,
      contentType: file.type,
      convertedFromHeic: false,
    };
  }

  const converted = await convert({
    buffer: Buffer.from(originalBytes),
    format: "JPEG",
    quality: 0.9,
  });

  return {
    bytes: new Uint8Array(converted),
    fileName: jpegFileName(file.name),
    contentType: "image/jpeg",
    convertedFromHeic: true,
  };
}
