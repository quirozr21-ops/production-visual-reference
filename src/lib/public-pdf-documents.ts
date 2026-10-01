import { randomUUID } from "node:crypto";
import { mkdir, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, relative, resolve, sep } from "node:path";

export type PublicPdfKind = "work-instruction" | "final-inspection";

export type PublicAktSpecification = {
  documentNumber: string;
  title: string | null;
};

type AktSpecificationIndexEntry = {
  document_number: string;
  file: string;
  title?: string;
};

type PublicPdfIndex = {
  "work-instruction"?: Record<string, string>;
  "final-inspection"?: Record<string, string>;
  "akt-specification"?: Record<string, AktSpecificationIndexEntry[]>;
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

export async function listPublicAktSpecifications(
  partNumber: string,
): Promise<PublicAktSpecification[]> {
  const root = approvedPdfRoot();
  const productNumber = partNumber.trim();
  if (!root || !productNumber) return [];

  try {
    const directory = resolve(root);
    const index = await readPublicPdfIndex(directory);
    const entries = index["akt-specification"]?.[productNumber] ?? [];
    const released: PublicAktSpecification[] = [];

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
      console.error("Unable to list released AKT specifications.", error);
    }
    return [];
  }
}

export async function findPublicAktSpecificationPdf(
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
    const entries = index["akt-specification"]?.[productNumber] ?? [];
    const entry = entries.find(
      (candidate) =>
        typeof candidate?.document_number === "string" &&
        candidate.document_number.trim() === number,
    );

    if (!entry || typeof entry.file !== "string") return null;
    return await resolveIndexedPdf(directory, entry.file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Unable to resolve released AKT specification.", error);
    }
    return null;
  }
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
  const root = approvedPdfRoot();
  if (!root) {
    throw new Error("PUBLIC_APPROVED_DOCUMENTS_ROOT is not configured.");
  }

  const productNumber = partNumber.trim();
  const number = documentNumber.trim();
  if (!productNumber || !number) {
    throw new Error("Product part number and AKT specification number are required.");
  }
  if (bytes.length < 5 || bytes.length > MAX_PUBLIC_PDF_UPLOAD_BYTES) {
    throw new Error("AKT specification PDFs must be 12 MB or smaller.");
  }
  if (Buffer.from(bytes.subarray(0, 5)).toString("ascii") !== "%PDF-") {
    throw new Error("The selected AKT specification is not a valid PDF.");
  }

  const directory = resolve(root);
  const index = await readPublicPdfIndex(directory);
  const aktIndex = index["akt-specification"] ?? {};
  const existing = aktIndex[productNumber] ?? [];

  if (!Array.isArray(existing)) {
    throw new Error("The AKT specification index entry for this product is invalid.");
  }
  if (existing.some((entry) => entry?.document_number?.trim() === number)) {
    throw new Error(`AKT specification ${number} is already linked to this product.`);
  }

  const safePartNumber = safePathSegment(productNumber, "product");
  const safeDocumentNumber = safePathSegment(number, "akt-spec");
  const safeOriginalName = safePathSegment(originalFileName, "specification.pdf");
  const pdfName = safeOriginalName.toLowerCase().endsWith(".pdf")
    ? safeOriginalName
    : `${safeOriginalName}.pdf`;
  const storedFileName = `${safeDocumentNumber}-${randomUUID().slice(0, 8)}-${pdfName}`;
  const relativeFile = `akt-specification/${safePartNumber}/${storedFileName}`;
  const destination = resolve(directory, ...relativeFile.split("/"));

  if (!isWithinFolder(directory, destination)) {
    throw new Error("Invalid AKT specification storage path.");
  }

  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, bytes, { flag: "wx" });

  try {
    aktIndex[productNumber] = [
      ...existing,
      {
        document_number: number,
        title: title.trim() || undefined,
        file: relativeFile,
      },
    ];
    index["akt-specification"] = aktIndex;

    // Node writes UTF-8 without a BOM, avoiding the PowerShell BOM issue.
    await writeFile(
      resolve(directory, "public-document-index.json"),
      `${JSON.stringify(index, null, 2)}\n`,
      "utf8",
    );
  } catch (error) {
    await rm(destination, { force: true });
    throw error;
  }

  return relativeFile;
}
