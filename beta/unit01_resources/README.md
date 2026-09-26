# Electric Circuits — Year 10 review pack

**Duration:** twelve 50-minute lessons. **Core audience:** AQA GCSE Combined Science: Trilogy Higher, with the matching AQA GCSE Physics circuit content. The separate-Physics-only static electricity topic appears as a workbook extension after the twelve lessons.

## What is here

| File | Use |
|---|---|
| `Electric Circuits - Year 10 Student Workbook.pdf` | 36-page A4 print booklet: reference toolkit, equation triangles, numbered tasks, space for answers, practical records and graphs, mixed exam clinic, progress tracker, Physics-only extension |
| `lesson_plans/Lesson 01 … Lesson 12 … .pdf` | Twelve two-page printable teaching plans with timing, preparation, expected task answers, misconceptions and checkpoint marking |
| `lesson_plans/*.md` | Editable masters for the lesson plans |
| `content.py`, `render.py` | Editable workbook content and the PDF renderer; run `render.py` to keep PDFs in step |
| `index.html` | Review landing page linking the pack and existing unit resources |

## Lesson route

| Lesson | Focus | Existing resource |
|---:|---|---|
| 1 | Charge, current and circuit symbols | Virtual Lab 1, pp. 3–6 |
| 2 | Potential difference and energy per coulomb | Virtual Lab 2, pp. 7–11 |
| 3 | Resistance and Ohm's law | Virtual Lab 3, pp. 12–16 |
| 4 | Wire length and resistance | Required practical resistance, Part A |
| 5 | Series and parallel rules | Circuit build/measurement |
| 6 | Resistors in series and parallel | Required practical resistance, Part B |
| 7 | Fixed resistor, filament lamp and diode I–V graphs | Graph interpretation |
| 8 | Measure I–V characteristics | Required practical I–V |
| 9 | Thermistors and LDRs | Sensor application |
| 10 | Mains, ac/dc and electrical safety | Causal explanation |
| 11 | Power and electrical work | Multi-step calculations |
| 12 | National Grid and mixed exam clinic | Synoptic practice and correction |

The workbook is a **companion**, not a replacement for the existing full virtual-lab and required-practical worksheets. They hold the detailed methods, circuit diagrams and additional analysis. The new booklet provides a single place for lesson tasks, central equation reference, selected practical recording, graphing and exam rehearsal.

## Existing resources to have ready

- [Year 10 unit home](../../gcsephy/year10phy/unit01/)
- [Electricity virtual labs PDF](../../gcsephy/year10phy/unit01/Y10%20Electricity%20Virtual%20Labs.pdf)
- [Resistance practical PDF](../../gcsephy/year10phy/unit01/Y10%20Required%20Practical%20-%20Resistance.pdf)
- [I–V practical PDF](../../gcsephy/year10phy/unit01/Y10%20Required%20Practical%20-%20IV%20Characteristics.pdf)
- [PhET Circuit Construction Kit DC — Lab](https://phet.colorado.edu/en/simulations/circuit-construction-kit-dc)

## Scope and exam-year note

The twelve lessons cover the existing unit's AQA Trilogy 6.2.1–6.2.4 / separate Physics 4.2.1–4.2.4 content, including resistance RP 15 / Physics RP 3 and I–V RP 16 / Physics RP 4. The optional workbook page covers separate Physics 4.2.5 static electricity. The site currently covers the circuits content only.

AQA has [confirmed that its 2027 physics equation sheets will be provided and unchanged from 2026](https://www.aqa.org.uk/news/gcse-maths-sciences-formulae-equation-sheets-2027-28). The booklet therefore teaches selecting, rearranging and applying equations rather than labelling the seven core circuit relationships as mandatory memory items for every exam year. Check the cohort's actual examination arrangements before teaching later years.

This pack uses original AQA-style questions, not past-paper extracts. A single twelve-lesson sequence cannot guarantee success on every unseen question; the final clinic and existing unit Exam Zone provide rehearsal and diagnosis.

## Regenerate and check

Edit `content.py` and/or `render.py`, then run `python3 render.py` in this folder with a Python environment containing ReportLab. This regenerates the workbook, twelve plan PDFs and twelve Markdown plans. All output is A4. Inspect the rendered PDF pages before printing, especially after changing text lengths.

## References checked

- [AQA Trilogy physics subject content](https://www.aqa.org.uk/subjects/science/gcse/science-8464/specification/physics-subject-content)
- [AQA Trilogy practical assessment](https://www.aqa.org.uk/subjects/science/gcse/science-8464/specification/practical-assessment)
- [AQA separate Physics electricity](https://www.aqa.org.uk/subjects/physics/gcse/physics-8463/specification/subject-content/electricity)
- [AQA 2027 equations-sheet update](https://www.aqa.org.uk/news/gcse-maths-sciences-formulae-equation-sheets-2027-28)
