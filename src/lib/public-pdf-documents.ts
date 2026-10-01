import { readFile, realpath, stat } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";

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

async function readPublicPdfIndex(directory: string) {
  const indexBytes = await readFile(
    resolve(directory, "public-document-index.json"),
    "utf8",
  );
  return JSON.parse(indexBytes) as PublicPdfIndex;
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
