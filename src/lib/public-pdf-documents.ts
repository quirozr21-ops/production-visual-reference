import { randomUUID } from "node:crypto";
import { mkdir, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, relative, resolve, sep } from "node:path";

export type PublicPdfKind = "work-instruction" | "final-inspection";

export type PublicProductDocument = {
  documentNumber: string;
  title: string | null;
};

type ProductDocumentIndexEntry = {
  document_number: string;
  file: string;
  title?: string;
};

type PublicPdfIndex = {
  "work-instruction"?: Record<string, string>;
  "final-inspection"?: Record<string, string>;
  "akt-specification"?: Record<string, ProductDocumentIndexEntry[]>;
  "revision-control-notice"?: Record<string, ProductDocumentIndexEntry[]>;
};

export const MAX_PUBLIC_PDF_UPLOAD_BYTES = 12 * 1024 * 1024;

export function isPublicPdfKind(value: string): value is PublicPdfKind {
  return value === "work-instruction" || value === "final-inspection";
}

function approvedPdfRoot() {
  // This must be a curated folder of RELEASED PDFs, not a general engineering share.
  return process.env.PUBLIC_APPROVED_DOCUMENTS_ROOT?.trim() || null;
}

function isWithinFolder(folder: string, file: string) {
  const subpath = relative(folder, file);
  return subpath !== ".." && !subpath.startsWith(`..${sep}`) && !isAbsolute(subpath);
}

function safePathSegment(value: string, fallback: string) {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);

  return cleaned || fallback;
}

async function readPublicPdfIndex(directory: string) {
  const indexBytes = await readFile(
    resolve(directory, "public-document-index.json"),
    "utf8",
  );

  // Be tolerant of a UTF-8 BOM if the index was edited by Windows PowerShell.
  const normalized = indexBytes.replace(/^\uFEFF/, "");
  return JSON.parse(normalized) as PublicPdfIndex;
}

async function writePublicPdfIndex(directory: string, index: PublicPdfIndex) {
  // Node writes UTF-8 without a BOM, avoiding the Windows PowerShell BOM issue.
  await writeFile(
    resolve(directory, "public-document-index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
    "utf8",
  );
}

async function resolveIndexedPdf(directory: string, relativeFile: string) {
  if (!relativeFile.trim() || relativeFile.includes("\0") || isAbsolute(relativeFile)) {
    return null;
  }

  const candidate = resolve(directory, relativeFile);
  if (!isWithinFolder(directory, candidate) || extname(candidate).toLowerCase() !== ".pdf") {
    return null;
  }

  // Check resolved paths too so a symbolic link cannot escape the approved folder.
  const [realDirectory, realFile] = await Promise.all([
    realpath(directory),
    realpath(candidate),
  ]);
  if (!isWithinFolder(realDirectory, realFile)) return null;

  const info = await stat(realFile);
  if (!info.isFile() || info.size < 5 || info.size > 50 * 1024 * 1024) return null;
  return realFile;
}

export async function findPublicPdf(kind: PublicPdfKind, documentNumber: string) {
  const root = approvedPdfRoot();
  const number = documentNumber.trim();
  if (!root || !number) return null;

  try {
    const directory = resolve(root);
    const index = await readPublicPdfIndex(directory);
    const relativeFile = index[kind]?.[number];
    if (typeof relativeFile !== "string") return null;
    return await resolveIndexedPdf(directory, relativeFile);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Unable to resolve released public PDF.", error);
    }
    return null;
  }
}

async function listProductDocuments(
  kind: "akt-specification" | "revision-control-notice",
  partNumber: string,
): Promise<PublicProductDocument[]> {
  const root = approvedPdfRoot();
  const productNumber = partNumber.trim();
  if (!root || !productNumber) return [];

  try {
    const directory = resolve(root);
    const index = await readPublicPdfIndex(directory);
    const entries = index[kind]?.[productNumber] ?? [];
    const released: PublicProductDocument[] = [];

    for (const entry of entries) {
      if (
        !entry ||
        typeof entry.document_number !== "string" ||
        typeof entry.file !== "string"
      ) {
        continue;
      }

      const documentNumber = entry.document_number.trim();
      if (!documentNumber) continue;

      const file = await resolveIndexedPdf(directory, entry.file);
      if (!file) continue;

      released.push({
        documentNumber,
        title:
          typeof entry.title === "string" && entry.title.trim()
            ? entry.title.trim()
            : null,
      });
    }

    return released;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`Unable to list released ${kind} documents.`, error);
    }
    return [];
  }
}

async function findProductDocumentPdf(
  kind: "akt-specification" | "revision-control-notice",
  partNumber: string,
  documentNumber: string,
) {
  const root = approvedPdfRoot();
  const productNumber = partNumber.trim();
  const number = documentNumber.trim();
  if (!root || !productNumber || !number) return null;

  try {
    const directory = resolve(root);
    const index = await readPublicPdfIndex(directory);
    const entries = index[kind]?.[productNumber] ?? [];
    const entry = entries.find(
      (candidate) =>
        typeof candidate?.document_number === "string" &&
        candidate.document_number.trim() === number,
    );

    if (!entry || typeof entry.file !== "string") return null;
    return await resolveIndexedPdf(directory, entry.file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`Unable to resolve released ${kind} document.`, error);
    }
    return null;
  }
}

async function publishProductDocument({
  kind,
  partNumber,
  documentNumber,
  title,
  originalFileName,
  bytes,
  defaultFileName,
  defaultDocumentName,
}: {
  kind: "akt-specification" | "revision-control-notice";
  partNumber: string;
  documentNumber: string;
  title: string;
  originalFileName: string;
  bytes: Uint8Array;
  defaultFileName: string;
  defaultDocumentName: string;
}) {
  const root = approvedPdfRoot();
  if (!root) {
    throw new Error("PUBLIC_APPROVED_DOCUMENTS_ROOT is not configured.");
  }

  const productNumber = partNumber.trim();
  const number = documentNumber.trim();
  if (!productNumber || !number) {
    throw new Error(`Product part number and ${defaultDocumentName} number are required.`);
  }
  if (bytes.length < 5 || bytes.length > MAX_PUBLIC_PDF_UPLOAD_BYTES) {
    throw new Error(`${defaultDocumentName} PDFs must be 12 MB or smaller.`);
  }
  if (Buffer.from(bytes.subarray(0, 5)).toString("ascii") !== "%PDF-") {
    throw new Error(`The selected ${defaultDocumentName} is not a valid PDF.`);
  }

  const directory = resolve(root);
  const index = await readPublicPdfIndex(directory);
  const productIndex = index[kind] ?? {};
  const existing = productIndex[productNumber] ?? [];

  if (!Array.isArray(existing)) {
    throw new Error(`The ${defaultDocumentName} index entry for this product is invalid.`);
  }
  if (existing.some((entry) => entry?.document_number?.trim() === number)) {
    throw new Error(`${defaultDocumentName} ${number} is already linked to this product.`);
  }

  const safePartNumber = safePathSegment(productNumber, "product");
  const safeDocumentNumber = safePathSegment(number, defaultFileName);
  const safeOriginalName = safePathSegment(originalFileName, `${defaultFileName}.pdf`);
  const pdfName = safeOriginalName.toLowerCase().endsWith(".pdf")
    ? safeOriginalName
    : `${safeOriginalName}.pdf`;
  const storedFileName = `${safeDocumentNumber}-${randomUUID().slice(0, 8)}-${pdfName}`;
  const relativeFile = `${kind}/${safePartNumber}/${storedFileName}`;
  const destination = resolve(directory, ...relativeFile.split("/"));

  if (!isWithinFolder(directory, destination)) {
    throw new Error(`Invalid ${defaultDocumentName} storage path.`);
  }

  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, bytes, { flag: "wx" });

  try {
    productIndex[productNumber] = [
      ...existing,
      {
        document_number: number,
        title: title.trim() || undefined,
        file: relativeFile,
      },
    ];
    index[kind] = productIndex;
    await writePublicPdfIndex(directory, index);
  } catch (error) {
    await rm(destination, { force: true });
    throw error;
  }

  return relativeFile;
}

export async function listPublicAktSpecifications(partNumber: string) {
  return listProductDocuments("akt-specification", partNumber);
}

export async function findPublicAktSpecificationPdf(
  partNumber: string,
  documentNumber: string,
) {
  return findProductDocumentPdf("akt-specification", partNumber, documentNumber);
}

export async function publishPublicAktSpecification({
  partNumber,
  documentNumber,
  title,
  originalFileName,
  bytes,
}: {
  partNumber: string;
  documentNumber: string;
  title: string;
  originalFileName: string;
  bytes: Uint8Array;
}) {
  return publishProductDocument({
    kind: "akt-specification",
    partNumber,
    documentNumber,
    title,
    originalFileName,
    bytes,
    defaultFileName: "akt-spec",
    defaultDocumentName: "AKT specification",
  });
}

export async function listPublicRevisionControlNotices(partNumber: string) {
  return listProductDocuments("revision-control-notice", partNumber);
}

export async function findPublicRevisionControlNoticePdf(
  partNumber: string,
  documentNumber: string,
) {
  return findProductDocumentPdf("revision-control-notice", partNumber, documentNumber);
}

export async function publishPublicRevisionControlNotice({
  partNumber,
  documentNumber,
  title,
  originalFileName,
  bytes,
}: {
  partNumber: string;
  documentNumber: string;
  title: string;
  originalFileName: string;
  bytes: Uint8Array;
}) {
  return publishProductDocument({
    kind: "revision-control-notice",
    partNumber,
    documentNumber,
    title,
    originalFileName,
    bytes,
    defaultFileName: "revision-notice",
    defaultDocumentName: "Revision Control Notice",
  });
}
