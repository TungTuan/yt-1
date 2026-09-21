import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";

const output = new URL("../backups/komorebi-db.dump", import.meta.url);
const result = spawnSync(
  "docker",
  ["exec", "komorebi-db-1", "pg_dump", "-Fc", "-U", "komorebi", "-d", "komorebi"],
  { encoding: null, maxBuffer: 128 * 1024 * 1024 },
);

if (result.status !== 0) {
  throw new Error(result.stderr?.toString("utf8") || "pg_dump failed");
}

await fs.mkdir(new URL("../backups/", import.meta.url), { recursive: true });
await fs.writeFile(output, result.stdout);
console.log(`Database backup written: ${output.pathname} (${result.stdout.length} bytes)`);
