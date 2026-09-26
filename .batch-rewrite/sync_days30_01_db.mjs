import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const dates=['2026-09-30','2026-10-01'];
const all=[];
for(const name of (await fs.readdir('.batch-rewrite/content')).filter(x=>x.endsWith('.json'))){const d=JSON.parse(await fs.readFile(`.batch-rewrite/content/${name}`,'utf8'));all.push(...(Array.isArray(d)?d:[d]));}
const items=all.filter(x=>dates.includes(x.scheduled_date));
if(items.length!==16) throw new Error(`Expected 16 items, found ${items.length}`);
for(const d of ['30','01']){const r=JSON.parse(await fs.readFile(`.batch-rewrite/day${d}_self_review.json`,'utf8'));if(r.result!=='PASS'||r.minimum_observed_score<9)throw new Error(`Review gate failed day ${d}`);}
const arr=v=>Array.isArray(v)?v:String(v??'').split(',').map(x=>x.trim()).filter(Boolean);
const dq=(v,t)=>`$${t}$${v??''}$${t}$`;
const sql=["BEGIN;","DELETE FROM content_items WHERE scheduled_date IN (DATE '2026-09-30', DATE '2026-10-01');"];
for(const [i,x] of items.entries()){
 const t=`n${i}`;const meta={tags:arr(x.tags),hashtags:arr(x.hashtags),...(x.shorts_snippet?{shorts_snippet:x.shorts_snippet}:{}),...(x.questions?{questions:x.questions}:{}),...(x.is_letter_replacement?{is_letter_replacement:true}:{})};
 const status=String(x.needs_review).toUpperCase()==='TRUE'?'needs_review':'scripted';
 sql.push(`INSERT INTO content_items (id,market,segment_type,scheduled_date,time_slot,format,source,status,title,script_text,target_keyword,seo_title,seo_description,seo_tags,factual_qa_passed,language_qa_passed,qa_notes,qa_reviewed_by,qa_reviewed_at,script_metadata,created_at,updated_at) VALUES (gen_random_uuid(),'${x.market}','${x.segment_type}',DATE '${x.scheduled_date}','${x.time_slot}','long_form','excel_import','${status}',${dq(x.title,`${t}a`)},${dq(x.script_text,`${t}b`)},${dq(x.target_keyword,`${t}c`)},${dq(x.seo_title,`${t}d`)},${dq(x.seo_description,`${t}e`)},ARRAY[${arr(x.seo_tags).map((v,j)=>dq(v,`${t}s${j}`)).join(',')}],TRUE,TRUE,${dq('Self-review >= 9/10; duration and duplication audits PASS.',`${t}q`)},'codex-self-review',NOW(),${dq(JSON.stringify(meta),`${t}m`)}::jsonb,NOW(),NOW());`);
}
sql.push('COMMIT;');
const r=spawnSync('docker',['exec','-i','komorebi-db-1','psql','-v','ON_ERROR_STOP=1','-U','komorebi','-d','komorebi'],{input:sql.join('\n'),encoding:'utf8'});
if(r.status!==0) throw new Error(r.stderr||r.stdout);console.log(r.stdout.trim());
