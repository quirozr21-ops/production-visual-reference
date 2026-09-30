import { readFile, realpath, stat } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";

export type PublicPdfKind = "work-instruction" | "final-inspection";

type PublicPdfIndex = Record<PublicPdfKind, Record<string, string>>;

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

export async function findPublicPdf(kind: PublicPdfKind, documentNumber: string) {
  const root = approvedPdfRoot();
  const number = documentNumber.trim();
  if (!root || !number) return null;

  try {
    const directory = resolve(root);
    const indexBytes = await readFile(resolve(directory, "public-document-index.json"), "utf8");
    const index = JSON.parse(indexBytes) as Partial<PublicPdfIndex>;
    const relativeFile = index[kind]?.[number];

    // Files must be explicitly listed in the RELEASED document index.
    if (typeof relativeFile !== "string" || !relativeFile.trim()) return null;
    if (relativeFile.includes("\0") || isAbsolute(relativeFile)) return null;

    const candidate = resolve(directory, relativeFile);
    if (!isWithinFolder(directory, candidate) || extname(candidate).toLowerCase() !== ".pdf") {
      return null;
    }

    // Also check resolved paths so a symbolic link cannot escape the approved folder.
    const [realDirectory, realFile] = await Promise.all([
      realpath(directory),
      realpath(candidate),
    ]);
    if (!isWithinFolder(realDirectory, realFile)) return null;

    const info = await stat(realFile);
    if (!info.isFile() || info.size < 5 || info.size > 50 * 1024 * 1024) return null;
    return realFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Unable to resolve released public PDF.", error);
    }
    return null;
  }
}
