import { promises as fs } from "fs";
import path from "path";
import archiver from "archiver";

export async function zipDirectory(sourceDir: string, destinationFile: string): Promise<string> {
  await fs.mkdir(path.dirname(destinationFile), { recursive: true });

  const archive = archiver("zip", { zlib: { level: 9 } });
  const outputHandle = await fs.open(destinationFile, "w");
  const outputStream = outputHandle.createWriteStream();

  const finished = new Promise<void>((resolve, reject) => {
    outputStream.on("close", resolve);
    archive.on("warning", (err) => {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        console.warn("Archiver warning", err.message);
      } else {
        reject(err);
      }
    });
    archive.on("error", reject);
  });

  archive.pipe(outputStream);
  archive.directory(sourceDir, false);
  await archive.finalize();
  await finished;
  await outputHandle.close();
  return destinationFile;
}
