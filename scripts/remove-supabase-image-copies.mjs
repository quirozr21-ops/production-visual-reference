import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();
const storageRoot = process.env.VISUAL_REFERENCE_STORAGE_ROOT?.trim();

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
}
if (!supabaseSecretKey) {
  throw new Error("SUPABASE_SECRET_KEY is not configured.");
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
const missingServerFiles = [];

console.log(`Found ${assets.length} visual asset record(s).`);
console.log(`Server storage root: ${rootPath}`);
console.log("Preflight: verifying every visual asset has a SERVER04 file before any Supabase Storage deletion.\n");

for (const asset of assets) {
  const serverPath = resolveStoragePath(asset.storage_path);
  if (!(await fileExists(serverPath))) {
    missingServerFiles.push(asset.storage_path);
  }
}

if (missingServerFiles.length > 0) {
  console.error("Cleanup aborted. No Supabase Storage files were deleted.");
  console.error(`Missing server copies: ${missingServerFiles.length}`);
  for (const storagePath of missingServerFiles) {
    console.error(`[missing-server-copy] ${storagePath}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Preflight passed: ${assets.length} server file(s) verified.`);
  console.log("Deleting only Supabase Storage copies. visual_assets database records will not be deleted.\n");

  let removed = 0;
  let alreadyAbsent = 0;
  let failed = 0;

  for (const asset of assets) {
    const { data, error } = await supabase.storage
      .from("visual-references")
      .remove([asset.storage_path]);

    if (error) {
      failed += 1;
      console.error(`[failed] ${asset.storage_path}: ${error.message}`);
      continue;
    }

    if (Array.isArray(data) && data.length > 0) {
      removed += 1;
      console.log(`[removed] ${asset.storage_path}`);
    } else {
      alreadyAbsent += 1;
      console.log(`[already absent] ${asset.storage_path}`);
    }
  }

  console.log("\nCleanup summary");
  console.log(`Removed from Supabase Storage: ${removed}`);
  console.log(`Already absent from Supabase Storage: ${alreadyAbsent}`);
  console.log(`Failed: ${failed}`);
  console.log(`Database visual asset records retained: ${assets.length}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}
