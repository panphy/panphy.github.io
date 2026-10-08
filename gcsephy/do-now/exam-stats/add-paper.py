#!/usr/bin/env python3
"""Add one AQA paper to marks.csv, one row per question part.

    python3 add-paper.py 2025-06 8463/1H question-paper.pdf mark-scheme.pdf

Marks come from the question paper; the assessment objective, specification
references and required practical numbers come from the mark scheme. Nothing
of the paper's wording is stored. Needs macOS (PDFKit through swift) or
pdftotext on the PATH. Check the warnings: the marks found must add up to the
paper total, and parts it could not read have to be typed into marks.csv by hand.
"""
import csv, os, re, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
MARKS = os.path.join(HERE, "marks.csv")
FIELDS = ["Series", "Paper", "Part", "Marks", "Recall", "Equation", "Levels", "Sections", "Practicals"]
SWIFT = """import PDFKit
import Foundation
let d = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1]))!
for i in 0..<d.pageCount { print(d.page(at: i)?.string ?? "") }
"""


def text_of(pdf):
    if shutil.which("pdftotext"):
        return subprocess.run(["pdftotext", pdf, "-"], capture_output=True, text=True, check=True).stdout
    with tempfile.NamedTemporaryFile("w", suffix=".swift", delete=False) as source:
        source.write(SWIFT)
    try:
        return subprocess.run(["swift", source.name, pdf], capture_output=True, text=True, check=True).stdout
    finally:
        os.unlink(source.name)


def physics_reference(reference):
    """Trilogy (6.x) references renumbered to the Physics (4.x) specification."""
    if not reference.startswith("6."):
        return reference
    reference = "4." + reference[2:]
    if reference.startswith("4.5.4"):
        return "4.5.6" + reference[5:]
    if reference.startswith("4.5.5"):
        return "4.5.7" + reference[5:]
    return reference


def parts_of(question_paper):
    """{part: (marks, is it a write-down-the-equation question)} in paper order."""
    text = re.sub(r"\*\d+\*|IB/\S+|Do not write\s+outside the\s+box|Turn over.*", "", question_paper)
    starts = list(re.finditer(r"(?m)^(\d) (\d) \. (\d+)\s", text))
    parts = {}
    for at, start in enumerate(starts):
        part = f"{start.group(1)}{start.group(2)}.{start.group(3)}"
        body = text[start.end(): starts[at + 1].start() if at + 1 < len(starts) else len(text)]
        marks = re.search(r"\[(\d+) marks?\]", body)
        stem = body[: marks.start()] if marks else body
        equation = bool(re.search(r"(?i)(write down the|what is the|what|which)( of the following)? equations?", stem))
        parts[part] = (int(marks.group(1)) if marks else None, equation)
    return parts


def rows_for(series, paper, question_paper, mark_scheme):
    parts = parts_of(question_paper)
    # A line that starts with a number such as "15.7" is an answer, not a part, unless the paper has that part.
    blocks = [block for block in re.finditer(r"(?m)^(\d\d\.\d+)\s", mark_scheme) if block.group(1) in parts]
    rows, seen = [], set()
    for at, block in enumerate(blocks):
        part = block.group(1)
        if part in seen or part not in parts:
            continue
        seen.add(part)
        body = mark_scheme[block.end(): blocks[at + 1].start() if at + 1 < len(blocks) else len(mark_scheme)]
        body = re.split(r"Total\s+Question|\nQuestion \d+\n", body)[0]
        objectives = re.findall(r"AO([123])", body)
        sections = sorted({physics_reference(r) for r in re.findall(r"\b[46]\.\d(?:\.\d+){1,4}\b", body) if re.match(r"[46]\.[1-8]\.\d", r)})
        practicals = sorted(set(re.findall(r"RPA ?(\d+)", body)), key=int)
        marks, equation = parts[part]
        recall = 0 if equation or not objectives or marks is None else marks * objectives.count("1") / len(objectives)
        rows.append({
            "Series": series, "Paper": paper, "Part": part, "Marks": "" if marks is None else marks,
            "Recall": f"{recall:g}", "Equation": int(equation), "Levels": int(bool(re.search(r"Level [23]:", body))),
            "Sections": ";".join(sections), "Practicals": ";".join(practicals),
        })
    total = sum(row["Marks"] or 0 for row in rows)
    expected = 100 if paper.startswith("8463") else 70
    problems = [f"part {p} is in the question paper but was not found in the mark scheme" for p in parts if p not in seen]
    problems += [f"part {row['Part']}: no marks found" for row in rows if row["Marks"] == ""]
    problems += [f"part {row['Part']}: no specification reference found" for row in rows if not row["Sections"]]
    if total != expected:
        problems.append(f"marks add up to {total}, not {expected}")
    return rows, problems


def main():
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    series, paper, question_pdf, scheme_pdf = sys.argv[1:]
    if not re.fullmatch(r"20\d\d-(06|11)", series) or paper not in ("8463/1H", "8463/2H", "8464/P/1H", "8464/P/2H"):
        sys.exit("Series is YYYY-06 or YYYY-11; paper is 8463/1H, 8463/2H, 8464/P/1H or 8464/P/2H.")
    existing = []
    if os.path.exists(MARKS):
        with open(MARKS, encoding="utf-8-sig", newline="") as source:
            existing = list(csv.DictReader(source))
    if any(row["Series"] == series and row["Paper"] == paper for row in existing):
        sys.exit(f"{series} {paper} is already in marks.csv. Delete its rows first to import it again.")
    rows, problems = rows_for(series, paper, text_of(question_pdf), text_of(scheme_pdf))
    rows = sorted(existing + rows, key=lambda row: (row["Series"], row["Paper"], row["Part"]))
    with open(MARKS, "w", encoding="utf-8", newline="") as target:
        writer = csv.DictWriter(target, FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    print(f"{series} {paper}: added {sum(1 for r in rows if r['Series'] == series and r['Paper'] == paper)} parts.")
    for problem in problems:
        print("  CHECK:", problem)


if __name__ == "__main__":
    main()
