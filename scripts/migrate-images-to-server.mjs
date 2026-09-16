import { constants } from "node:fs";
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();
const storageRoot = process.env.VISUAL_REFERENCE_STORAGE_ROOT?.trim();

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
}
if (!supabaseSecretKey) {
  throw new Error("SUPABASE_SECRET_KEY is not configured. Add the server-only Supabase secret key to .env.local before running this migration.");
}
if (!storageRoot) {
  throw new Error("VISUAL_REFERENCE_STORAGE_ROOT is not configured.");
}

const rootPath = resolve(storageRoot);

function resolveStoragePath(storagePath) {
  const cleanSegments = storagePath
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean);
  const fullPath = resolve(rootPath, ...cleanSegments);
  const relativePath = relative(rootPath, fullPath);

  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error(`Invalid visual reference storage path: ${storagePath}`);
  }

  return fullPath;
}

async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

async function loadVisualAssets() {
  const pageSize = 500;
  const assets = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("visual_assets")
      .select("id,storage_path")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    assets.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  return assets;
}

const assets = await loadVisualAssets();
let copied = 0;
let skipped = 0;
let failed = 0;

console.log(`Found ${assets.length} visual asset record(s).`);
console.log(`Server storage root: ${rootPath}`);
console.log("Copy-only migration: existing server files will be skipped and Supabase files will not be deleted.\n");

for (const asset of assets) {
  const destination = resolveStoragePath(asset.storage_path);

  if (await fileExists(destination)) {
    skipped += 1;
    console.log(`[skip] ${asset.storage_path}`);
    continue;
  }

  const { data, error } = await supabase.storage
    .from("visual-references")
    .download(asset.storage_path);

  if (error || !data) {
    failed += 1;
    console.error(`[failed] ${asset.storage_path}: ${error?.message ?? "No file returned"}`);
    continue;
  }

  try {
    const bytes = new Uint8Array(await data.arrayBuffer());
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, bytes, { flag: "wx" });
    copied += 1;
    console.log(`[copied] ${asset.storage_path} (${bytes.byteLength} bytes)`);
  } catch (error) {
    if (error?.code === "EEXIST") {
      skipped += 1;
      console.log(`[skip] ${asset.storage_path}`);
      continue;
    }
    failed += 1;
    console.error(`[failed] ${asset.storage_path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log("\nMigration summary");
console.log(`Copied: ${copied}`);
console.log(`Skipped (already on server): ${skipped}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
