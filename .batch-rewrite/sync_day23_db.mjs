import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repo = "/Users/tung/Documents/youtube-1";
const targetDate = process.env.TARGET_DATE ?? "2026-09-23";
const dayNumber = targetDate.slice(-2).replace(/^0/, "");
const contentDir = path.join(repo, ".batch-rewrite/content");
const review = JSON.parse(await fs.readFile(path.join(repo, `.batch-rewrite/day${dayNumber}_self_review.json`), "utf8"));
if (review.result !== "PASS" || review.minimum_observed_score < 9) throw new Error("Review gate failed; refusing DB sync");
const all = [];
for (const name of (await fs.readdir(contentDir)).filter((name) => name.endsWith(".json"))) {
  const parsed = JSON.parse(await fs.readFile(path.join(contentDir, name), "utf8"));
  all.push(...(Array.isArray(parsed) ? parsed : [parsed]));
}
const items = all.filter((item) => item.scheduled_date === targetDate);
const expectedItems = new Date(`${targetDate}T00:00:00Z`).getUTCDay() === 0 ? 6 : 8;
if (items.length !== expectedItems) throw new Error(`Expected ${expectedItems} items, found ${items.length}`);
const dq = (value, tag) => `$${tag}$${value ?? ""}$${tag}$`;
const array = (value) => String(value ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const statements = ["BEGIN;"];
for (const [index, item] of items.entries()) {
  const tag = `d23v${index}`;
  const metadata = {tags:array(item.tags),hashtags:array(item.hashtags),...(item.shorts_snippet ? {shorts_snippet:item.shorts_snippet} : {}),...(item.questions ? {questions:item.questions} : {})};
  statements.push(`UPDATE content_items SET
title=${dq(item.title,`${tag}t`)}, script_text=${dq(item.script_text,`${tag}s`)}, target_keyword=${dq(item.target_keyword,`${tag}k`)},
seo_title=${dq(item.seo_title,`${tag}st`)}, seo_description=${dq(item.seo_description,`${tag}sd`)},
seo_tags=ARRAY[${array(item.seo_tags).map((x,i)=>dq(x,`${tag}a${i}`)).join(",")}],
script_metadata=script_metadata || ${dq(JSON.stringify(metadata),`${tag}m`)}::jsonb, updated_at=NOW()
WHERE market='${item.market}' AND scheduled_date=DATE '${targetDate}' AND time_slot='${item.time_slot}' AND segment_type='${item.segment_type}';`);
}
statements.push("COMMIT;");
const result = spawnSync("docker", ["exec","-i","komorebi-db-1","psql","-v","ON_ERROR_STOP=1","-U","komorebi","-d","komorebi"], {input:statements.join("\n"),encoding:"utf8"});
if (result.status !== 0) throw new Error(result.stderr || result.stdout);
console.log(result.stdout.trim());
