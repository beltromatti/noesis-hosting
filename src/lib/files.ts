import { promises as fs } from "fs";
import path from "path";

export async function streamFileAsResponse(filePath: string, filename?: string) {
  const stat = await fs.stat(filePath);
  const handle = await fs.open(filePath, "r");
  const stream = handle.createReadStream();
  const cleanup = () => handle.close().catch(() => undefined);
  stream.on("close", cleanup);
  stream.on("error", cleanup);

  return new Response(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": stat.size.toString(),
      "Content-Disposition": `attachment; filename="${filename ?? path.basename(filePath)}"`,
      "Cache-Control": "no-store",
    },
  });
}
