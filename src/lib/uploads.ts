import { promises as fs } from "fs";
import path from "path";
import extract from "extract-zip";
import { promisify } from "util";
import { execFile } from "child_process";
import { v4 as uuidv4 } from "uuid";
import { env, MAX_ARCHIVE_BYTES } from "./env";

const execFileAsync = promisify(execFile);

export type ArchiveValidationResult = {
  ok: boolean;
  message?: string;
};

export async function persistArchiveTemp(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_ARCHIVE_BYTES) {
    throw new Error(`Archive exceeds the maximum size of ${env.MAX_ARCHIVE_SIZE_MB}MB.`);
  }

  const buffer = Buffer.from(arrayBuffer);
  const tmpName = `${uuidv4()}.zip`;
  const tmpPath = path.join(env.PLATFORM_UPLOAD_TMP, tmpName);
  await fs.mkdir(env.PLATFORM_UPLOAD_TMP, { recursive: true });
  await fs.writeFile(tmpPath, buffer);
  return tmpPath;
}

export async function scanArchive(filePath: string): Promise<ArchiveValidationResult> {
  const scanners = ["clamdscan", "clamscan"];
  for (const scanner of scanners) {
    try {
      const { stdout } = await execFileAsync(scanner, ["--no-summary", filePath]);
      if (/OK$/m.test(stdout.trim())) {
        return { ok: true };
      }
      return { ok: false, message: stdout };
    } catch (error) {
      const err = error as NodeJS.ErrnoException & { stdout?: string };
      if (err.code === "ENOENT") {
        continue; // scanner not found, try next
      }
      if (typeof err.stdout === "string" && err.stdout.includes("FOUND")) {
        return { ok: false, message: err.stdout };
      }
      return { ok: false, message: err.message ?? "Unknown scanner error" };
    }
  }
  return {
    ok: false,
    message: "No antivirus engine available. Install ClamAV (clamdscan or clamscan).",
  };
}

export async function extractArchive(source: string, destination: string) {
  await fs.rm(destination, { recursive: true, force: true });
  await fs.mkdir(destination, { recursive: true });
  await extract(source, { dir: destination });
}

export async function ensureDeploymentHasIndex(destination: string) {
  const indexPath = path.join(destination, "index.html");
  const exists = await fs
    .access(indexPath)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    throw new Error("Uploaded site is missing an index.html entry point.");
  }
}
