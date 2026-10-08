#!/usr/bin/env python3
"""Print a prompt that asks another AI model to audit these statistics independently.

    python3 audit-prompt.py > prompt.txt

The figures in the prompt are worked out from the CSV files as they are now, so run it
after adding a year. Push the changes first: the prompt points at the public copies of
the files. Paste the output into a model that can browse the web and run code, and save
what comes back as a short record in audits/. See README.md.
"""
import csv, os
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = "https://raw.githubusercontent.com/panphy/panphy.github.io/main/gcsephy/do-now/exam-stats"
COURSES = {"8463": "Physics (8463)", "8464": "Trilogy (8464)"}


def rows(name):
    with open(os.path.join(HERE, name), encoding="utf-8-sig", newline="") as source:
        return list(csv.DictReader(source))


marks, sections, facts = rows("marks.csv"), rows("sections.csv"), rows("facts.csv")
practicals, corrections = rows("practicals.csv"), rows("corrections.csv")
corrected = {(r["Series"], r["Paper"], r["Part"]): r for r in corrections}
series = sorted({r["Series"] for r in marks})


def topic_of(reference):
    best = None
    for section in sections:
        if (reference == section["Section"] or reference.startswith(section["Section"] + ".")) and (not best or len(section["Section"]) > len(best["Section"])):
            best = section
    return best


def figures(code):
    mine = [r for r in marks if r["Paper"].startswith(code)]
    total = sum(int(r["Marks"]) for r in mine)
    recall = sum(float(r["Recall"]) for r in mine)
    equation = sum(int(r["Marks"]) for r in mine if r["Equation"] == "1")
    by_series = []
    for name in series:
        sat = [r for r in mine if r["Series"] == name]
        by_series.append(f"{name} {sum(float(r['Recall']) for r in sat) / sum(int(r['Marks']) for r in sat):.0%}")
    topics = defaultdict(float)
    for r in mine:
        correction = corrected.get((r["Series"], r["Paper"], r["Part"]))
        references = (correction["Sections"] if correction and correction["Sections"] else r["Sections"]).split(";")
        for reference in references:
            topics[topic_of(reference)["Topic"]] += float(r["Recall"]) / len(references)
    top = sorted(topics.items(), key=lambda item: -item[1])[:4]
    return "\n".join([
        f"{COURSES[code]}:",
        f"- {len({(r['Series'], r['Paper']) for r in mine})} papers and {total:,} marks in total.",
        f"- {recall:g} recall marks, which is {recall / total:.0%} of all marks.",
        f"- {equation} marks for writing down or choosing an equation.",
        f"- Recall share by series: {', '.join(by_series)}.",
        "- The four topics with the highest rates (recall marks per 100 marks of this course's papers): "
        + "; ".join(f'"{name}" ({value / total * 100:.1f})' for name, value in top) + ".",
    ])


print(f"""I need an independent check of a set of exam statistics. Please work as a careful auditor: recompute everything yourself with code, do not take my figures on trust, and tell me plainly where you disagree or could not check.

BACKGROUND
I teach AQA GCSE Physics. I have counted where the "recall" marks were in {len({(r['Series'], r['Paper']) for r in marks})} AQA Higher papers: GCSE Physics 8463 (Papers 1H and 2H, 100 marks each) and Combined Science: Trilogy 8464 (Physics Papers 1H and 2H, 70 marks each), in {len(series)} exam series ({', '.join(series)}). The results are shown to teachers and students as a slide deck with a separate view for each course, so errors matter.

SCOPE: HIGHER TIER ONLY
Every paper counted is a Higher tier paper. No Foundation tier papers and no Combined Science: Synergy (8465) papers are included. Some questions are common to the Foundation and Higher papers; they are counted because they appear on the Higher paper.

DATA FILES
The CSV files are public. Fetch each one from its raw GitHub address:
- {RAW}/marks.csv
- {RAW}/sections.csv
- {RAW}/corrections.csv
- {RAW}/facts.csv
- {RAW}/practicals.csv
The columns are explained in {RAW}/README.md

Before you start, confirm that you fetched each file in full by reporting its number of data rows: marks.csv should have {len(marks)}, sections.csv {len(sections)}, corrections.csv {len(corrections)}, facts.csv {len(facts)} and practicals.csv {len(practicals)}. If a file came back shortened or you could not fetch it, stop and tell me.

What each file holds:
1. marks.csv: one row per question part, as the mark scheme prints it. Marks; Recall (the AO1 marks: the share of the part's printed assessment-objective labels that are AO1, and 0 for an equation part); Equation (1 if the part asks the student to write down or choose an equation); Levels (1 for an answer marked in levels); Sections (specification references, with Trilogy 6.x renumbered to Physics 4.x; in Forces, 6.5.4 became 4.5.6 and 6.5.5 became 4.5.7); Practicals (required practical numbers).
2. sections.csv: maps a specification section to a Unit, a Topic and a Course (Combined or Separate). A reference belongs to the row with the longest Section that it equals or starts with (followed by a dot).
3. corrections.csv: parts where the printed reference is not used as it stands. A value in Sections replaces the part's sections; Status "Discounted" marks a question AQA discounted, which is still counted as printed.
4. facts.csv: one row for each time a fact was asked as a recall question, with the series, paper and part. A fact is shown once it has rows in two series. Written by hand.
5. practicals.csv: required practical numbers, names and the qualification each number belongs to.

SOURCE FOR PAPERS
Question papers and mark schemes are linked from two pages.
Physics 8463: https://revisionscience.com/gcse-revision/physics/physics-gcse-past-papers/aqa-gcse-physics-past-papers
Combined Science: Trilogy 8464: https://revisionscience.com/gcse-revision/science/science-gcse-past-papers/aqa-gcse-science-past-papers
- Use Higher tier Physics papers only: 8463/1H and 8463/2H, and "Combined Science Trilogy: Physics - Higher" Papers 1 and 2 (8464/P/1H and 8464/P/2H). Ignore Foundation, Biology and Chemistry papers.
- The November 2020 and November 2021 papers are printed and sometimes listed with June dates. They are 2020-11 and 2021-11 in my data.
- Before relying on any linked PDF, confirm that you opened and read the file itself, by quoting its paper code and series from the front page. If you could not open a PDF, say so and do not guess its contents.
- Tell me which papers and mark schemes you actually read, and which you could not.

HOW THE FIGURES ARE CALCULATED
- Each course is counted from its own papers only.
- A part that lists several sections shares its Marks and its Recall equally between them, after any replacement from corrections.csv.
- A topic's rate is its recall marks per 100 marks of that course's papers. Separate topics do not appear in the Trilogy figures.

FIGURES I CLAIM (please recompute and confirm or correct each)
{figures("8463")}

{figures("8464")}

WHAT I WANT YOU TO DO
Part A: check the data files.
1. Report rows, papers and series. Check that each Physics paper totals 100 marks and each Trilogy paper 70.
2. Confirm that only the four Higher paper codes appear and that each series has exactly those four papers.
3. Look for suspicious rows: missing or zero Marks, Recall greater than Marks, empty Sections, duplicate Series/Paper/Part, gaps in part numbering, Equation = 1 with Recall above 0, a practical number from the wrong qualification.
4. Check that every reference in Sections and in corrections.csv maps to a row of sections.csv, that every corrections.csv row matches a part in marks.csv, and that every facts.csv row points at a part in marks.csv that has Recall above 0.

Part B: recompute the statistics.
5. Recompute every figure in "Figures I claim" and show yours beside mine.
6. For each course, produce a table of all its topics with unit, recall marks, total marks and rate per 100, sorted by rate.

Part C: check the mapping and the method.
7. Review sections.csv against the AQA GCSE Physics 8463 specification. Is each section in the right unit and topic, and correctly marked Combined or Separate ("physics only" content)? Does each topic name describe everything it collects?
8. Comment on the method: the AO1 share of printed labels, especially for answers marked in levels; sharing between sections; leaving out equation marks; and how much can be concluded from this many series. Say which conclusions are safe and which are not.

Part D: check the data against the papers and mark schemes you were able to read.
9. Pick at least two parts from every paper, including parts with several assessment objectives, several sections, equation questions and practical tags. Compare marks.csv with the mark scheme (marks, assessment objectives, specification references, required practical) and report every mismatch.
10. Look for mark-scheme references that do not match what the question is actually about. Report them as content corrections, separately from transcription mismatches, and say whether corrections.csv already covers each one.
11. Read the examiner report for any paper where you can, and tell me if a question was discounted or withdrawn that corrections.csv does not record.
12. Check every row of facts.csv: is there a recall question on that fact in that part? List facts that were asked in a series with no row, and rows where the AO1 credit is for something else.
13. Do not reproduce question wording at length; refer to parts by paper and part number.

HOW TO REPORT
- Start with a short verdict: are the headline figures right, and how many problems did you find, by seriousness?
- Then a numbered list of problems, most serious first: what is wrong, where, the evidence and the correction you suggest.
- Then the tables from Part B, and the list of files, papers and mark schemes you actually read.
- Finish with what you did not or could not check, and anything you assumed.
- If you are unsure about something, say so rather than guessing.""")
