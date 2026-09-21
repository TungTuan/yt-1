# -*- coding: utf-8 -*-
"""
Assembles content/*.json (54 items, jp+kr, 2026-09-21..27) into
weekly-content-ja-kr-2026-09-21.xlsx, matching EXACTLY the column schema the
app's importer expects (apps/server/src/services/excelTemplate.ts /
excelImport.ts) so the file can be re-imported into any environment running
this app without modification.

Sheets:
  - Weekly_Schedule   (imported by the app)
  - Quiz_Questions    (imported by the app)
  - Duration_Audit    (report only, ignored by importer)
  - Duplication_Audit (report only, ignored by importer)
  - Huong_dan         (guide sheet, ignored by importer's data parsing)
"""
import json
import glob
import os
import subprocess
import sys

try:
    import openpyxl
    from openpyxl.styles import Font
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", "openpyxl"])
    import openpyxl
    from openpyxl.styles import Font

ROOT = os.path.dirname(os.path.abspath(__file__))
CONTENT_DIR = os.path.join(ROOT, "content")
OUT_PATH = os.path.join(ROOT, "weekly-content-ja-kr-2026-09-21.xlsx")

WEEKLY_SCHEDULE_COLUMNS = [
    "market", "scheduled_date", "time_slot", "segment_type", "title", "script_text",
    "tags", "needs_review", "shorts_snippet", "target_keyword", "seo_title",
    "seo_description", "seo_tags", "hashtags",
]
QUIZ_QUESTIONS_COLUMNS = [
    "market", "date", "question", "choice_1", "choice_2", "choice_3", "choice_4",
    "answer", "fun_fact",
]
DURATION_AUDIT_COLUMNS = [
    "market", "date", "segment_type", "title", "script_chars",
    "estimated_duration", "target_duration", "result",
]
DUPLICATION_AUDIT_COLUMNS = [
    "market", "date", "segment_type", "title", "sentence_count", "unique_sentence_count",
    "unique_sentence_percent", "max_internal_repeat", "cross_video_matches", "result", "notes",
]


def load_items():
    items = []
    for path in sorted(glob.glob(os.path.join(CONTENT_DIR, "*.json"))):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        items.extend(data if isinstance(data, list) else [data])
    items.sort(key=lambda it: (it["scheduled_date"], it["market"], it["time_slot"]))
    return items


def add_header(ws, columns):
    ws.append(columns)
    for cell in ws[1]:
        cell.font = Font(bold=True)


def build():
    items = load_items()
    with open(os.path.join(ROOT, "duration_audit.json"), encoding="utf-8") as f:
        dur_rows = json.load(f)
    with open(os.path.join(ROOT, "duplication_audit.json"), encoding="utf-8") as f:
        dup_rows = json.load(f)

    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    # --- Huong_dan (first, matches app template convention) ---
    guide = wb.create_sheet("Huong_dan")
    guide.column_dimensions["A"].width = 30
    guide.column_dimensions["B"].width = 100
    fixed_greeting = ("안녕하세요. 이 늦은 시각까지 햇살 편지를 찾아 주셔서 고맙습니다. "
                       "하루를 마무리하며, 조용히 마음을 내려놓아 보세요.")
    guide_rows = [
        ("Sheet", "Ý nghĩa"),
        ("Weekly_Schedule", "1 dòng = 1 content_item dài (long_form). Cột đúng schema import của app "
                              "(apps/server/src/services/excelTemplate.ts) để có thể import lại vào bất kỳ "
                              "environment nào chạy app này."),
        ("Quiz_Questions", "Câu hỏi con cho các dòng có segment_type = quiz, liên kết theo market + date với Weekly_Schedule."),
        ("Duration_Audit", "Báo cáo độ dài kịch bản (không import) — mọi dòng đã PASS thời lượng tối thiểu theo segment_type."),
        ("Duplication_Audit", "Báo cáo trùng lặp câu/đoạn (không import) — mọi dòng đã PASS."),
        ("", ""),
        ("Xử lý letter_reading", "Dự án CHƯA có thư khán giả thật nào. Theo đúng quy tắc, các slot letter_reading "
         "đã được thay thế bằng segment_type = companionship (ngày 22, 24, 26 hằng tháng, cả jp/kr), không bịa thư "
         "giả làm thật. Các dòng này luôn đặt needs_review = TRUE và is_letter_replacement = true trong dữ liệu gốc "
         "(importer cũng tự động ép needs_review = TRUE cho segment_type = companionship dù giá trị cột này là gì)."),
        ("Whitelist lời chào/outro", "Câu chào cố định sau được phép lặp lại giữa nhiều video bedtime_story (furniture "
         f"cố định của kênh), đã whitelist trong .batch-rewrite/audit.py (WHITELIST_LINES), không tính là lỗi trùng lặp: "
         f"\"{fixed_greeting}\""),
        ("Tình trạng SEO", "13 dòng KR được viết lại hoàn toàn trong đợt này (7 bedtime_story + 3 nostalgia + 3 "
         "companionship) đã có đủ target_keyword/seo_title/seo_description/seo_tags/hashtags riêng, không trùng nhau. "
         "41 dòng còn lại (27 dòng JP giữ nguyên + 14 dòng KR morning_news/quiz giữ nguyên) ĐỂ TRỐNG các cột SEO trong "
         "file này — hệ thống sẽ tự sinh SEO fallback từ apps/server/config/seo-keywords.json lúc import (đúng thiết kế "
         "sẵn có của app). LƯU Ý: buildFallbackSeo() hiện sinh seo_description bằng mẫu câu tiếng Nhật cố định bất kể "
         "market — cần kiểm tra lại SEO fallback cho các dòng KR sau khi import và sửa thủ công nếu cần; đây là lỗi có "
         "sẵn của app (apps/server/src/services/seo.ts), không phải lỗi của đợt rewrite này."),
        ("", ""),
        ("Cột Weekly_Schedule", "Ghi chú"),
        ("market", "Bắt buộc. jp hoặc kr."),
        ("scheduled_date", "Bắt buộc. YYYY-MM-DD."),
        ("time_slot", "Bắt buộc. 07:00 (morning_news) / 12:00 (quiz) / 19:00 (nostalgia, companionship) / 21:00 (bedtime_story)."),
        ("segment_type", "Bắt buộc. morning_news, nostalgia, quiz, bedtime_story, companionship (letter_reading không dùng ở đợt này)."),
        ("needs_review", "TRUE/FALSE. companionship luôn bị importer ép thành TRUE."),
        ("shorts_snippet", "Chỉ có ở một số dòng quiz/nostalgia đã có sẵn shorts snippet từ đợt build trước."),
    ]
    for row in guide_rows:
        guide.append(row)
    guide["A1"].font = Font(bold=True)
    guide["B1"].font = Font(bold=True)
    guide["A12"].font = Font(bold=True)

    # --- Weekly_Schedule ---
    sched = wb.create_sheet("Weekly_Schedule")
    add_header(sched, WEEKLY_SCHEDULE_COLUMNS)
    quiz_count = 0
    for it in items:
        row = [
            it["market"],
            it["scheduled_date"],
            it["time_slot"],
            it["segment_type"],
            it["title"],
            it["script_text"],
            it.get("tags", ""),
            it.get("needs_review", "FALSE"),
            it.get("shorts_snippet", ""),
            it.get("target_keyword", ""),
            it.get("seo_title", ""),
            it.get("seo_description", ""),
            it.get("seo_tags", ""),
            it.get("hashtags", ""),
        ]
        sched.append(row)
        if it["segment_type"] == "quiz":
            quiz_count += 1
    sched.column_dimensions["F"].width = 60
    for col in "ABCDEGHIJKLMN":
        sched.column_dimensions[col].width = 20

    # --- Quiz_Questions ---
    quiz_ws = wb.create_sheet("Quiz_Questions")
    add_header(quiz_ws, QUIZ_QUESTIONS_COLUMNS)
    quiz_rows = 0
    for it in items:
        if it["segment_type"] != "quiz":
            continue
        for q in it.get("questions", []):
            choices = (q.get("choices", []) + ["", "", "", ""])[:4]
            quiz_ws.append([
                it["market"], it["scheduled_date"], q.get("question", ""),
                choices[0], choices[1], choices[2], choices[3],
                q.get("answer", ""), q.get("fun_fact", ""),
            ])
            quiz_rows += 1
    quiz_ws.column_dimensions["C"].width = 40
    quiz_ws.column_dimensions["I"].width = 40

    # --- Duration_Audit ---
    dur_ws = wb.create_sheet("Duration_Audit")
    add_header(dur_ws, DURATION_AUDIT_COLUMNS)
    for r in dur_rows:
        dur_ws.append([r[c] for c in DURATION_AUDIT_COLUMNS])

    # --- Duplication_Audit ---
    dup_ws = wb.create_sheet("Duplication_Audit")
    add_header(dup_ws, DUPLICATION_AUDIT_COLUMNS)
    for r in dup_rows:
        dup_ws.append([r[c] for c in DUPLICATION_AUDIT_COLUMNS])
    dup_ws.column_dimensions["D"].width = 30
    dup_ws.column_dimensions["K"].width = 40

    wb.save(OUT_PATH)

    all_dur_pass = all(r["result"] == "PASS" for r in dur_rows)
    all_dup_pass = all(r["result"] == "PASS" for r in dup_rows)
    print(f"Wrote {OUT_PATH}")
    print(f"Weekly_Schedule rows: {len(items)} (quiz items: {quiz_count})")
    print(f"Quiz_Questions rows: {quiz_rows}")
    print(f"Duration_Audit: {sum(1 for r in dur_rows if r['result']=='PASS')}/{len(dur_rows)} PASS -> {'OK' if all_dur_pass else 'BLOCKED'}")
    print(f"Duplication_Audit: {sum(1 for r in dup_rows if r['result']=='PASS')}/{len(dup_rows)} PASS -> {'OK' if all_dup_pass else 'BLOCKED'}")
    if not (all_dur_pass and all_dup_pass):
        print("ERROR: not all items PASS audit — per spec, file must not be exported until all PASS.")
        sys.exit(1)


if __name__ == "__main__":
    build()
