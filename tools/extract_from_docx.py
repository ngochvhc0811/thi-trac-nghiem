#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path
from docx import Document

LEVEL_MAP = {1: "easy", 2: "normal", 3: "hard"}


def clean(text):
    text = text.replace("\xa0", " ").replace("\t", " ")
    return re.sub(r"\s+", " ", text).strip()


def extract(source):
    doc = Document(source)
    paras = [clean(p.text) for p in doc.paragraphs if clean(p.text)]
    questions = []
    level_num = None
    i = 0

    while i < len(paras):
        text = paras[i]
        level_match = re.match(r"^MỨC\s+([123])\s*:", text, re.I)
        if level_match:
            level_num = int(level_match.group(1))
            i += 1
            continue

        if not text.startswith("#"):
            i += 1
            continue

        if level_num not in LEVEL_MAP:
            raise ValueError("Gặp câu hỏi trước khi xác định MỨC 1/2/3.")

        question = text[1:].strip()
        options = {}
        j = i + 1
        while j < len(paras) and len(options) < 4:
            row = paras[j]
            if row.startswith("#") or re.match(r"^MỨC\s+[123]\s*:", row, re.I):
                break
            m = re.match(r"^([ABCD])\.\s*(.*)$", row, re.S)
            if m:
                options[m.group(1)] = m.group(2).strip()
            elif options:
                last = list(options)[-1]
                options[last] += " " + row
            j += 1

        if set(options) != set("ABCD"):
            raise ValueError(f"Câu {len(questions)+1} không đủ A/B/C/D: {question}")

        questions.append({
            "id": len(questions) + 1,
            "question": question,
            "level": LEVEL_MAP[level_num],
            "options": [{"key": k, "text": options[k]} for k in "ABCD"],
            "correctOriginalKey": "A"
        })
        i = j

    counts = {
        "easy": sum(q["level"] == "easy" for q in questions),
        "normal": sum(q["level"] == "normal" for q in questions),
        "hard": sum(q["level"] == "hard" for q in questions),
    }

    return {
        "meta": {
            "title": "Câu hỏi, đáp án trắc nghiệm kiểm tra nhận thức về Đảng năm 2025",
            "source": Path(source).name,
            "total": len(questions),
            "correctAnswerRule": "Trong tài liệu nguồn, đáp án đúng của mọi câu là phương án A.",
            "difficultyRanges": {
                "easy": {"label": "Mức 1", "count": counts["easy"]},
                "normal": {"label": "Mức 2", "count": counts["normal"]},
                "hard": {"label": "Mức 3", "count": counts["hard"]},
            }
        },
        "questions": questions
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_from_docx.py source.docx [output.json]")
        raise SystemExit(2)

    src = Path(sys.argv[1])
    dst = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("data/questions.json")
    payload = extract(src)
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Đã ghi {payload['meta']['total']} câu vào {dst}")


if __name__ == "__main__":
    main()
