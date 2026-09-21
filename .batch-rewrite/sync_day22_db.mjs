import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const contentDir = "/Users/tung/Documents/youtube-1/.batch-rewrite/content";
const files = (await fs.readdir(contentDir)).filter((name) => name.endsWith(".json"));
const all = [];
for (const name of files) {
  const parsed = JSON.parse(await fs.readFile(path.join(contentDir, name), "utf8"));
  all.push(...(Array.isArray(parsed) ? parsed : [parsed]));
}
const items = all.filter((item) => item.scheduled_date === "2026-09-22");
if (items.length !== 8) throw new Error(`Expected 8 items, found ${items.length}`);

const slots = {"07:00": "07:00", "12:00": "12:00", "19:00": "19:00", "21:00": "21:00"};
const dq = (value, tag) => `$${tag}$${value ?? ""}$${tag}$`;
const array = (value) => String(value ?? "").split(",").map((x) => x.trim()).filter(Boolean);

const statements = ["BEGIN;"];
for (const [index, item] of items.entries()) {
  const tag = `v${index}`;
  const metadata = {
    tags: array(item.tags),
    hashtags: array(item.hashtags),
    ...(item.shorts_snippet ? {shorts_snippet: item.shorts_snippet} : {}),
    ...(item.questions ? {questions: item.questions} : {}),
    ...(item.is_letter_replacement ? {is_letter_replacement: true} : {}),
  };
  statements.push(`
UPDATE content_items SET
  title = ${dq(item.title, `${tag}t`)},
  script_text = ${dq(item.script_text, `${tag}s`)},
  target_keyword = ${dq(item.target_keyword, `${tag}k`)},
  seo_title = ${dq(item.seo_title, `${tag}st`)},
  seo_description = ${dq(item.seo_description, `${tag}sd`)},
  seo_tags = ARRAY[${array(item.seo_tags).map((x, i) => dq(x, `${tag}a${i}`)).join(",")}],
  script_metadata = script_metadata || ${dq(JSON.stringify(metadata), `${tag}m`)}::jsonb,
  updated_at = NOW()
WHERE market = '${item.market}'
  AND scheduled_date = DATE '${item.scheduled_date}'
  AND time_slot = '${slots[item.time_slot]}'
  AND segment_type = '${item.segment_type}';`);
}
statements.push("COMMIT;");
const sql = statements.join("\n");
const result = spawnSync("docker", ["exec", "-i", "komorebi-db-1", "psql", "-v", "ON_ERROR_STOP=1", "-U", "komorebi", "-d", "komorebi"], {input: sql, encoding: "utf8"});
if (result.status !== 0) throw new Error(result.stderr || result.stdout);
console.log(result.stdout.trim());
