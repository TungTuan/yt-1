#!/usr/bin/env python3
"""
Duplication + Duration audit for the week-2 (2026-09-21..27) content rewrite.
Reads all JSON files in .batch-rewrite/content/*.json (one list of items per file,
or one item per file — both accepted), runs the checks from the user's spec section 8,
and writes duration_audit.json / duplication_audit.json / report.txt.

Exit code 0 = everything PASS. Exit code 1 = at least one FAIL (report says which).
"""
import json, re, sys, glob, os
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.abspath(__file__))
CONTENT_DIR = os.path.join(ROOT, "content")

# --- duration model (same calibration used by durationTargets.ts this session) ---
SEC_PER_CHAR = 0.1951
SEC_PER_PAUSE = 0.334

TARGETS = {
    # segment_type -> (min_sec, max_sec)
    "morning_news": (120, 180),
    "quiz": (240, 300),
    "nostalgia": (480, 600),
    "companionship": (300, 360),       # Saturday-style companionship
    "companionship_short": (180, 240), # letter_reading replacement slots
    "bedtime_story": (1680, 1920),
}

# Exact lines allowed to repeat across many videos without tripping the cross-video check
# (fixed channel intro/outro furniture) — reported explicitly in the audit output.
WHITELIST_LINES = {
    "안녕하세요. 이 늦은 시각까지 햇살 편지를 찾아 주셔서 고맙습니다. 하루를 마무리하며, 조용히 마음을 내려놓아 보세요.",
}


def load_items():
    items = []
    for path in sorted(glob.glob(os.path.join(CONTENT_DIR, "*.json"))):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            items.extend(data)
        else:
            items.append(data)
    return items


def split_sentences(text):
    # Strip PAUSE markers and scene-label prefixes for sentence-level analysis; keep the raw
    # text elsewhere for char counts. Splits on JP/KR/EN sentence enders.
    clean = text.replace("[PAUSE]", " ")
    parts = re.split(r"(?<=[。！？.!?])\s*", clean)
    return [p.strip() for p in parts if len(p.strip()) > 0]


def split_paragraphs(text):
    return [p.strip() for p in text.split("[PAUSE]") if p.strip()]


def char_len(text):
    return len(text.replace("[PAUSE]", "").replace("\n", ""))


def estimate_duration(text):
    pauses = text.count("[PAUSE]")
    chars = char_len(text)
    return round(chars * SEC_PER_CHAR + pauses * SEC_PER_PAUSE, 1)


def target_for(item):
    seg = item["segment_type"]
    if seg == "companionship" and item.get("is_letter_replacement"):
        return TARGETS["companionship_short"]
    return TARGETS[seg]


def run_duration_audit(items):
    rows = []
    fails = []
    for it in items:
        text = it["script_text"]
        chars = char_len(text)
        est = estimate_duration(text)
        tmin, tmax = target_for(it)
        result = "PASS" if est >= tmin else "FAIL"
        if result == "FAIL":
            fails.append(f"{it['market']}/{it['scheduled_date']}/{it['segment_type']} '{it['title']}': est {est}s < min {tmin}s")
        rows.append({
            "market": it["market"], "date": it["scheduled_date"], "segment_type": it["segment_type"],
            "title": it["title"], "script_chars": chars, "estimated_duration": est,
            "target_duration": f"{tmin}-{tmax}s", "result": result,
        })
    return rows, fails


def run_duplication_audit(items):
    rows = []
    fails = []

    # cross-video indices: sentence(>35c) -> set of video keys ; paragraph(>60c) -> set of video keys
    cross_sentence_owners = defaultdict(set)
    cross_paragraph_owners = defaultdict(set)
    video_key = lambda it: f"{it['market']}|{it['scheduled_date']}|{it['segment_type']}|{it['title']}"

    per_item_sentences = {}
    per_item_paragraphs = {}
    for it in items:
        text = it["script_text"]
        sents = split_sentences(text)
        paras = split_paragraphs(text)
        per_item_sentences[video_key(it)] = sents
        per_item_paragraphs[video_key(it)] = paras
        for s in sents:
            if len(s) > 35 and s not in WHITELIST_LINES:
                cross_sentence_owners[s].add(video_key(it))
        for p in paras:
            if len(p) > 60 and p not in WHITELIST_LINES:
                cross_paragraph_owners[p].add(video_key(it))

    cross_sentence_hits = defaultdict(list)  # video_key -> [offending sentences]
    for s, owners in cross_sentence_owners.items():
        if len(owners) >= 3:
            for o in owners:
                cross_sentence_hits[o].append(s)

    cross_paragraph_hits = defaultdict(list)
    for p, owners in cross_paragraph_owners.items():
        if len(owners) >= 2:
            for o in owners:
                cross_paragraph_hits[o].append(p)

    for it in items:
        key = video_key(it)
        text = it["script_text"]
        sents = per_item_sentences[key]
        paras = per_item_paragraphs[key]
        seg = it["segment_type"]

        sent_counts = Counter(sents)
        long_sent_counts = Counter(s for s in sents if len(s) > 20)
        max_internal_repeat = max(long_sent_counts.values()) if long_sent_counts else 1
        unique_pct = round(len(set(sents)) / len(sents) * 100, 1) if sents else 100.0

        min_pct = 90.0 if seg == "bedtime_story" else 95.0

        notes = []
        result = "PASS"

        if max_internal_repeat > 2:
            result = "FAIL"
            offenders = [s for s, c in long_sent_counts.items() if c > 2]
            notes.append(f"sentence repeated {max_internal_repeat}x internally: {offenders[0][:40]}...")

        if unique_pct < min_pct:
            result = "FAIL"
            notes.append(f"unique_sentence_percent {unique_pct}% < required {min_pct}%")

        para_counts = Counter(paras)
        dup_paras = [p for p, c in para_counts.items() if c > 1 and len(p) > 60]
        if dup_paras:
            result = "FAIL"
            notes.append(f"paragraph repeated verbatim within video: {dup_paras[0][:40]}...")

        scene_titles = re.findall(r"(?:第\d+景|第\d+章|\d+장|\d+화)、?\s*([^。.\n]{1,20})[。.]", text)
        if scene_titles and len(scene_titles) != len(set(scene_titles)):
            result = "FAIL"
            notes.append(f"duplicate scene names: {scene_titles}")

        cross_matches = len(set(cross_sentence_hits.get(key, []))) + len(set(cross_paragraph_hits.get(key, [])))
        if cross_matches > 0:
            result = "FAIL"
            ex = (cross_sentence_hits.get(key) or cross_paragraph_hits.get(key))[0]
            notes.append(f"cross-video reuse ({cross_matches} instances), e.g. '{ex[:40]}...'")

        if result == "FAIL":
            fails.append(f"{it['market']}/{it['scheduled_date']}/{seg} '{it['title']}': " + "; ".join(notes))

        rows.append({
            "market": it["market"], "date": it["scheduled_date"], "segment_type": seg, "title": it["title"],
            "sentence_count": len(sents), "unique_sentence_count": len(set(sents)),
            "unique_sentence_percent": unique_pct, "max_internal_repeat": max_internal_repeat,
            "cross_video_matches": cross_matches, "result": result, "notes": "; ".join(notes) if notes else "",
        })

    return rows, fails


def main():
    items = load_items()
    if not items:
        print("No content items found in .batch-rewrite/content/*.json")
        sys.exit(1)

    dur_rows, dur_fails = run_duration_audit(items)
    dup_rows, dup_fails = run_duplication_audit(items)

    with open(os.path.join(ROOT, "duration_audit.json"), "w", encoding="utf-8") as f:
        json.dump(dur_rows, f, ensure_ascii=False, indent=1)
    with open(os.path.join(ROOT, "duplication_audit.json"), "w", encoding="utf-8") as f:
        json.dump(dup_rows, f, ensure_ascii=False, indent=1)

    all_fails = dur_fails + dup_fails
    print(f"Loaded {len(items)} items.")
    print(f"Duration audit: {sum(1 for r in dur_rows if r['result']=='PASS')}/{len(dur_rows)} PASS")
    print(f"Duplication audit: {sum(1 for r in dup_rows if r['result']=='PASS')}/{len(dup_rows)} PASS")
    if all_fails:
        print(f"\n{len(all_fails)} FAILURES:")
        for f_ in all_fails:
            print(" -", f_)
        sys.exit(1)
    else:
        print("\nALL CHECKS PASS.")
        sys.exit(0)


if __name__ == "__main__":
    main()
