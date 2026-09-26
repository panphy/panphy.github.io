#!/usr/bin/env python3
"""Build the print PDFs and editable lesson-plan Markdown.

Run with the bundled Codex Python runtime, or any Python with reportlab installed.
No site build step is involved; this is only for authoring the review PDFs.
"""
from pathlib import Path
import sys
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle, KeepTogether
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

sys.dont_write_bytecode = True
from content import LESSONS, TASK_ANSWERS

ROOT = Path(__file__).resolve().parent
PLANS = ROOT / "lesson_plans"
PLANS.mkdir(exist_ok=True)
W, H = A4
NAVY = HexColor("#1d3557")
BLUE = HexColor("#28658f")
PALE = HexColor("#edf4f8")
INK = HexColor("#1c3049")
GREY = HexColor("#66778a")
LINE = HexColor("#c7d2dc")
GOLD = HexColor("#efb848")
WHITE = HexColor("#ffffff")

FONT_DIR = Path("/System/Library/Fonts/Supplemental")
pdfmetrics.registerFont(TTFont("Arial", str(FONT_DIR / "Arial.ttf")))
pdfmetrics.registerFont(TTFont("Arial-Bold", str(FONT_DIR / "Arial Bold.ttf")))
pdfmetrics.registerFont(TTFont("Arial-Italic", str(FONT_DIR / "Arial Italic.ttf")))

def para(c, s, x, top, width, size=10, leading=14, bold=False, color=INK):
    style = ParagraphStyle("p", fontName="Arial-Bold" if bold else "Arial", fontSize=size,
                           leading=leading, textColor=color, spaceAfter=0)
    p = Paragraph(escape(s), style)
    _, height = p.wrap(width, 500)
    p.drawOn(c, x, H-top-height)
    return top + height

def label(c, s, x, top, size=8, color=BLUE):
    c.setFillColor(color); c.setFont("Arial-Bold", size)
    c.drawString(x, H-top, s.upper())

def rule(c, x, top, width, color=LINE):
    c.setStrokeColor(color); c.setLineWidth(0.65)
    c.line(x, H-top, x+width, H-top)

def box(c, x, top, width, height, fill=PALE, stroke=None, radius=4):
    c.setFillColor(fill); c.setStrokeColor(stroke or fill)
    c.roundRect(x, H-top-height, width, height, radius, fill=1, stroke=bool(stroke))

def header(c, section, title, page):
    label(c, section, 44, 42)
    c.setFillColor(GREY); c.setFont("Arial", 8)
    c.drawRightString(W-44, H-42, title.upper())
    rule(c, 44, 51, W-88)
    c.setFont("Arial", 8); c.drawString(44, 25, "Electric Circuits · Year 10 Student Workbook")
    c.setFont("Arial-Bold", 8); c.drawRightString(W-44, 25, str(page))

def answer_lines(c, x, top, width, count=2, gap=23):
    for i in range(count): rule(c, x, top+i*gap, width)
    return top + count*gap

def section_title(c, number, title, top):
    c.setFillColor(BLUE); c.circle(56, H-top+2, 10, fill=1, stroke=0)
    c.setFillColor(WHITE); c.setFont("Arial-Bold", 9); c.drawCentredString(56, H-top-1, str(number))
    para(c, title, 74, top-8, W-118, 13, 17, True)
    rule(c, 44, top+20, W-88)

def cover(c):
    c.setFillColor(NAVY); c.rect(0, 0, W, H, fill=1, stroke=0)
    label(c, "Year 10 Physics · Unit booklet", 55, 91, 10, GOLD)
    para(c, "Electric", 55, 110, 490, 39, 43, True, WHITE)
    para(c, "Circuits", 55, 152, 490, 39, 43, True, WHITE)
    para(c, "Charge, energy and resistance — a twelve-lesson route from first circuits to confident AQA-style answers.", 55, 214, 460, 14, 21, False, HexColor("#cbd8e5"))
    c.setStrokeColor(GOLD); c.setLineWidth(3); c.line(55, H-298, 170, H-298)
    para(c, "Predict. Measure. Explain. Then prove it with an equation.", 55, 327, 460, 17, 24, False, WHITE)
    box(c, 55, 665, W-110, 100, HexColor("#2b496d"), HexColor("#6c849e"))
    for text, x, y in [("NAME",75,692),("CLASS",310,692),("TEACHER",75,739),("LAB PARTNER",310,739)]:
        label(c,text,x,y,7,HexColor("#a9bdd0")); rule(c,x,y+25,205,HexColor("#7d96af"))
    label(c, "Keep this booklet for all twelve lessons", 55, 798, 8, HexColor("#9eb4c8"))
    c.showPage()

def roadmap(c, page):
    header(c,"Start here","How this booklet works",page)
    para(c,"Twelve lessons. One connected story.",44,75,W-88,22,27,True,NAVY)
    para(c,"The moving charge is conserved. Energy is transferred by the components. Measurements turn those ideas into equations, graphs and explanations.",44,112,W-88,11,16)
    label(c,"How every lesson works",44,165)
    para(c,"The case → your mission → a key idea → worked example → numbered tasks → AQA-style checkpoint. Write in the spaces. When a task points to an existing virtual-lab or required-practical sheet, use that sheet alongside this booklet.",44,179,W-88,10,15)
    rows=[("01","Charge and current"),("02","Potential difference"),("03","Resistance and Ohm's law"),("04","Required practical: wire length"),("05","Series and parallel"),("06","Required practical: combinations"),("07","Reading I-V graphs"),("08","Required practical: I-V"),("09","Thermistors and LDRs"),("10","Mains and safety"),("11","Power and energy"),("12","National Grid and exam clinic")]
    label(c,"The route",44,273)
    for i,(n,title) in enumerate(rows):
        col=i//6; row=i%6; x=44+col*256; y=293+row*45
        box(c,x,y,245,36,WHITE,LINE)
        label(c,n,x+11,y+22,10,BLUE)
        para(c,title,x+43,y+10,188,9.3,13,True)
    box(c,44,590,W-88,130,PALE)
    label(c,"Where to find the live resources",58,612)
    para(c,"Student companion: panphy.app/gcsephy/year10phy/unit01/",58,625,W-116,10,15,True)
    para(c,"Virtual labs: use the linked 16-page 'Y10 Electricity Virtual Labs' PDF and PhET Circuit Construction Kit DC - Lab. Required practicals: use the linked Resistance and I-V Characteristics worksheets for full methods, diagrams and extra analysis.",58,647,W-116,9.5,14)
    c.showPage()

def toolkit(c,page):
    header(c,"Reference","Equation toolkit",page)
    para(c,"The equation toolkit",44,76,W-88,23,28,True,NAVY)
    para(c,"Choose the relationship from the quantities in the question. Rearrange before inserting numbers. Check units and whether the answer is sensible.",44,113,W-88,10,15)
    equations=[("Q = It","charge = current x time","C = A x s"),("E = QV","energy = charge x p.d.","J = C x V"),("V = IR","p.d. = current x resistance","V = A x ohm"),("Rtotal = R1 + R2","total resistance in series","all in ohm"),("P = VI","power = p.d. x current","W = V x A"),("P = I²R","power = current squared x resistance","W = A² x ohm"),("E = Pt","energy = power x time","J = W x s"),("VpIp = VsIs","ideal transformer, HT only","primary power = secondary power")]
    for i,(eq,words,units) in enumerate(equations):
        col=i%2; row=i//2; x=44+col*256; y=159+row*120
        box(c,x,y,245,106,WHITE,LINE)
        para(c,eq,x+13,y+11,218,17,21,True,BLUE)
        para(c,words,x+13,y+41,218,9.5,13)
        para(c,units,x+13,y+69,218,9,12,False,GREY)
    box(c,44,656,W-88,83,PALE)
    para(c,"Exam-year note",58,666,W-116,10,14,True,NAVY)
    para(c,"AQA supplies a physics equations sheet for the 2027 exams. Practise selecting and rearranging equations independently; check the arrangement for the cohort's actual exam year. The transformer relation applies to Higher tier.",58,685,W-116,9.1,13)
    c.showPage()

def triangle(c,x,top,title,a,b,d,forms,note=None):
    box(c,x,top,245,166,WHITE,LINE)
    para(c,title,x+12,top+9,220,10,14,True,NAVY)
    cx=x+66; cy=H-(top+90)
    path=c.beginPath(); path.moveTo(cx,cy+42); path.lineTo(cx-44,cy-38); path.lineTo(cx+44,cy-38); path.close()
    c.setStrokeColor(BLUE); c.setLineWidth(1.5); c.drawPath(path,stroke=1,fill=0)
    c.line(cx-29,cy-5,cx+29,cy-5); c.line(cx,cy-5,cx,cy-38)
    c.setFillColor(NAVY); c.setFont("Arial-Bold",13)
    c.drawCentredString(cx,cy+12,a); c.drawCentredString(cx-19,cy-27,b); c.drawCentredString(cx+20,cy-27,d)
    y=top+48
    for f in forms:
        para(c,f,x+124,y,108,9,13,True,BLUE); y+=22
    if note: para(c,note,x+12,top+138,220,8,10,False,GREY)

def triangles(c,page):
    header(c,"Reference","Equation triangles",page)
    para(c,"Equation triangles",44,74,W-88,23,28,True,NAVY)
    para(c,"Cover the letter you want. Across the bottom means multiply; top over bottom means divide. For squared current, undo the square root last.",44,109,W-88,10,15)
    tri=[("Charge","Q","I","t",["Q = I x t","I = Q / t","t = Q / I"]),
         ("Electrical work","E","Q","V",["E = Q x V","Q = E / V","V = E / Q"]),
         ("Resistance","V","I","R",["V = I x R","I = V / R","R = V / I"]),
         ("Electrical power","P","V","I",["P = V x I","V = P / I","I = P / V"]),
         ("Energy and time","E","P","t",["E = P x t","P = E / t","t = E / P"]),
         ("Heating power","P","I²","R",["P = I² x R","R = P / I²","I = sqrt(P / R)"]) ]
    for i,t in enumerate(tri): triangle(c,44+(i%2)*256,153+(i//2)*178,*t)
    box(c,44,700,W-88,46,PALE)
    para(c,"Not triangle rules: in series, Rtotal = R1 + R2 + ... . For an ideal Higher-tier transformer, VpIp = VsIs; divide the product of the known side by the known quantity on the other side.",55,710,W-110,8.8,12)
    c.showPage()

def lesson_first(c,l,page):
    header(c,f"Lesson {l['n']}",l['title'],page)
    para(c,l['title'],44,72,W-88,22,27,True,NAVY)
    para(c,l['focus'],44,104,W-88,9.5,13,False,GREY)
    box(c,44,132,W-88,77,PALE)
    label(c,"The case",57,151)
    para(c,l['case'],57,161,W-114,9.4,13)
    label(c,"Your mission",44,230)
    para(c,l['mission'],44,242,W-88,10,15,True)
    box(c,44,278,W-88,82,WHITE,BLUE)
    label(c,"Key idea",57,298)
    para(c,l['key'],57,311,W-114,9.6,14)
    label(c,"Worked example",44,383)
    box(c,44,394,W-88,70,PALE)
    para(c,l['worked'],57,409,W-114,10.2,15,True)
    section_title(c,1,"Build the idea",493)
    y=521
    for i in range(2):
        y=para(c,f"{i+1}. {l['tasks'][i]}",54,y,W-108,9.8,14)+13
        y=answer_lines(c,54,y,W-108,4 if i==0 else 3,20)+13
    if y>800: raise RuntimeError(f"Lesson {l['n']} first page overflow: {y}")
    c.showPage()

def lesson_second(c,l,page):
    header(c,f"Lesson {l['n']}",l['title']+" · practice",page)
    para(c,"Measure, reason, answer",44,74,W-88,21,26,True,NAVY)
    section_title(c,2,"Use the evidence",131)
    y=170
    for i in range(2,4):
        y=para(c,f"{i+1}. {l['tasks'][i]}",54,y,W-108,9.7,14)+12
        y=answer_lines(c,54,y,W-108,3 if i==2 else 4,20)+13
    section_title(c,3,"AQA-style checkpoint",y+3)
    y+=43
    y=para(c,l['exam'],54,y,W-108,9.8,14)+13
    y=answer_lines(c,54,y,W-108,6,21)+10
    box(c,44,y,W-88,57,PALE)
    label(c,"Check before moving on",57,y+17)
    para(c,"Have I shown a formula or rule, used the given data, included units and answered the words in the question?",57,y+27,W-114,9.1,13)
    if y+57>752: raise RuntimeError(f"Lesson {l['n']} second page overflow: {y+57}")
    c.showPage()

def graph_grid(c,x,top,width,height,xlabel,ylabel,bipolar=False):
    c.setStrokeColor(LINE); c.setLineWidth(.4)
    for i in range(11):
        xx=x+i*width/10; c.line(xx,H-top,xx,H-top-height)
    for j in range(9):
        yy=H-top-j*height/8; c.line(x,yy,x+width,yy)
    c.setStrokeColor(NAVY); c.setLineWidth(1.3)
    if bipolar:
        c.line(x,H-top-height/2,x+width,H-top-height/2)
        c.line(x+width/2,H-top,x+width/2,H-top-height)
        para(c,"0",x+width/2+4,top+height/2+3,20,8,10)
    else:
        c.line(x,H-top-height,x+width,H-top-height); c.line(x,H-top,x,H-top-height)
    para(c,xlabel,x+width/2-55,top+height+11,150,9,12,True)
    c.saveState(); c.translate(x-27,H-top-height/2-30); c.rotate(90)
    c.setFillColor(INK); c.setFont("Arial-Bold",9); c.drawString(0,0,ylabel); c.restoreState()

def practical_page(c,l,page):
    header(c,f"Lesson {l['n']}","Practical record",page)
    para(c,"Practical record",44,74,W-88,21,26,True,NAVY)
    if l['n']==4:
        para(c,"RP 15 / RP 3 · Wire length at constant temperature. Switch off between readings.",44,111,W-88,9.5,14)
        heads=["Length / cm","p.d. / V","Current / A","R = V/I / ohm"]
        rows=[[str(i),"","",""] for i in range(10,101,10)]
        graph=None
    elif l['n']==6:
        para(c,"RP 15 / RP 3 · Use the same two resistors and the same supply for each arrangement.",44,111,W-88,9.5,14)
        heads=["Arrangement","p.d. / V","Total I / A","Rtotal / ohm"]
        rows=[[s,"","",""] for s in ["One resistor","Two in series","Two in parallel"]]
        graph=None
    else:
        para(c,"RP 16 / RP 4 · Use the full practical sheet for every reading and all three graphs. Summarise one point in each direction here; protect the diode.",44,111,W-88,9.2,13)
        heads=["Device / direction","p.d. / V","Current / A","R at point / ohm"]
        rows=[[s,"","",""] for s in ["Resistor forward","Resistor reversed","Lamp forward","Lamp reversed","Diode forward","Diode reversed"]]
        graph=("p.d. / V","Current / A")
    data=[heads]+rows
    t=Table(data,colWidths=[128,115,115,149],rowHeights=[28]+[29]*len(rows))
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),NAVY),("TEXTCOLOR",(0,0),(-1,0),WHITE),("FONTNAME",(0,0),(-1,0),"Arial-Bold"),("FONTSIZE",(0,0),(-1,-1),8.8),("GRID",(0,0),(-1,-1),.6,LINE),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("LEFTPADDING",(0,0),(-1,-1),8)]))
    tw,th=t.wrap(W-88,700); t.drawOn(c,44,H-151-th)
    y=151+th+24
    if graph:
        label(c,"Graph the fixed resistor here; use the full sheet for lamp and diode",44,y)
        graph_grid(c,77,y+22,450,245,*graph,bipolar=(l['n']==8))
        y+=305
    else:
        label(c,"Explain the pattern",44,y)
        prompt = ("Describe the trend in your wire results. Name one control variable and explain how you kept it constant." if l['n']==4 else "Rank the three total resistances. Use current, p.d. and the number of paths to justify your ranking.")
        y=para(c,prompt,44,y+13,W-88,9.5,14)+14
        y=answer_lines(c,44,y,W-88,3 if l['n']==4 else 7,24)
    label(c,"Conclusion / evaluation",44,y+6)
    y=answer_lines(c,44,y+31,W-88,2,23)
    if y>770: raise RuntimeError(f"Practical page overflow: {l['n']} {y}")
    c.showPage()

def wire_graph_page(c,page):
    header(c,"Lesson 4","Wire practical graph",page)
    para(c,"Resistance against length",44,75,W-88,21,26,True,NAVY)
    para(c,"Use your Lesson 4 data. Choose a sensible scale; plot small crosses; draw a line of best fit.",44,111,W-88,9.5,14)
    graph_grid(c,82,164,440,410,"Length / cm","Resistance / ohm")
    label(c,"What does your graph show?",44,642)
    answer_lines(c,44,660,W-88,3,25)
    c.showPage()

EXAM = [
 ("1 · Charge", "A 0.80 A current flows for 2.5 min. Calculate charge. [3]"),
 ("2 · Voltage", "A component transfers 48 J while 8.0 C passes. Calculate its p.d. and explain its meaning. [4]"),
 ("3 · Circuits", "Two 6.0 ohm resistors are in series on 12 V. Find the total resistance, current and p.d. across one resistor. [4]"),
 ("4 · Required practical", "A wire-resistance graph has one point above the trend. Give two plausible causes and describe how you would check it. [4]"),
 ("5 · I-V", "A lamp carries 0.20 A at 2.0 V and 0.30 A at 6.0 V. Calculate R at both points and explain the change. [4]"),
 ("6 · Safety", "Explain why a metal-cased appliance needs an earth connection, including the role of a fuse or breaker. [5]"),
 ("7 · Power", "A 1.5 kW heater runs for 4.0 min on a 230 V supply. Calculate its energy transfer and current. [5]"),
 ("8 · Grid", "Explain high-p.d. transmission using two electrical equations. HT: an ideal transformer has 20 kV, 500 A input and 200 kV output; find output current. [7]")]
EXAM_ANSWERS = [
 "1: 2.5 min = 150 s; Q = It = 0.80 x 150 = 120 C (3).",
 "2: V = E/Q = 48/8.0 = 6.0 V; 6 J transferred per coulomb (4).",
 "3: Rtotal = 12 ohm; I = 1.0 A; each p.d. = 6.0 V (4).",
 "4: Contact position/reading error, heating or poor connection; repeat point, check apparatus, compare with trend (any well-justified four points).",
 "5: R = 10 ohm then 20 ohm; current heats filament and its resistance increases (4).",
 "6: Earth connects metal case to 0 V via low-resistance path; fault gives large current; fuse melts/breaker trips and disconnects live, protecting user (5).",
 "7: P = 1500 W, t = 240 s, E = 360000 J; I = P/V = 1500/230 = 6.5 A (5).",
 "8: High V lowers I for fixed P (P=VI); lower I reduces I^2R heating; step down for users. HT: Is = (20000 x 500)/200000 = 50 A (7)."
]

def exam_pages(c,start):
    for page_index in range(2):
        page=start+page_index
        header(c,"Exam clinic",f"Mixed questions · {page_index+1} of 2",page)
        para(c,"End-of-unit exam clinic",44,75,W-88,21,26,True,NAVY)
        para(c,"Write the equation or rule first. Show each substitution and unit. For explanations, link cause to effect.",44,111,W-88,9.5,14)
        y=151
        for title,question in EXAM[page_index*4:(page_index+1)*4]:
            label(c,title,44,y)
            y=para(c,question,44,y+10,W-88,9.4,14)+15
            y=answer_lines(c,44,y,W-88,4,22)+15
        if y>760: raise RuntimeError(f"Exam clinic overflow {page}")
        c.showPage()

def static_extension(c,page):
    header(c,"Physics only","Static electricity extension",page)
    para(c,"Static electricity",44,75,W-88,22,27,True,NAVY)
    para(c,"Separate Physics 4.2.5 only · Complete as an extension or independent study after Lesson 12.",44,109,W-88,9.4,14,False,GREY)
    box(c,44,140,W-88,108,PALE)
    label(c,"Key ideas",57,160)
    para(c,"Rubbing two insulators can transfer electrons. Gaining electrons makes an object negative; losing electrons leaves it positive. Like charges repel; unlike charges attract. These are non-contact forces.",57,173,W-114,9.5,14)
    para(c,"A charged object has an electric field. The field is strongest near it and weaker further away; another charge in the field experiences a force. Sparking can occur when charge moves through the air.",57,213,W-114,9.5,14)
    label(c,"1 · Electron transfer",44,280)
    para(c,"A plastic rod becomes negative when rubbed with a cloth. Which way did electrons move? What charge is left on the cloth?",44,294,W-88,9.5,14)
    answer_lines(c,44,339,W-88,3,22)
    label(c,"2 · Draw the field",44,439)
    para(c,"In the box, draw the field around an isolated positively charged sphere. Add arrows and show where the field is strongest.",44,453,W-88,9.5,14)
    box(c,44,480,W-88,151,WHITE,LINE)
    c.setStrokeColor(NAVY); c.setLineWidth(1); c.circle(W/2,H-556,13,fill=0,stroke=1)
    para(c,"+",W/2-4,544,12,15,True,NAVY)
    label(c,"3 · AQA-style explanation [4 marks]",44,660)
    para(c,"A small negative sphere is moved towards a charged positive sphere. Explain the changing force without describing any contact.",44,674,W-88,9.5,14)
    answer_lines(c,44,717,W-88,3,22)
    c.showPage()

def progress(c,page):
    header(c,"Finish","Progress and glossary",page)
    para(c,"Your progress",44,75,W-88,22,27,True,NAVY)
    para(c,"At the end of each lesson, tick one box honestly. Revisit the pages where you are still developing confidence.",44,112,W-88,9.5,14)
    y=156
    for l in LESSONS:
        if l['n']%2==0: box(c,44,y-15,W-88,37,PALE)
        para(c,f"{l['n']:02d}  {l['mission']}",53,y,W-210,8.5,12)
        for x in [466,493,520]:
            c.setStrokeColor(BLUE);c.circle(x,H-y-3,5,fill=0,stroke=1)
        y+=43
    label(c,"Not yet    /    Getting there    /    Solid",44,697,7,GREY)
    box(c,44,714,W-88,55,PALE)
    para(c,"The whole unit in one sentence",56,725,W-112,10,14,True,NAVY)
    para(c,"Charge flows, energy is transferred, and measurements plus circuit rules explain what happens.",56,741,W-112,9.2,13)
    c.showPage()

def make_workbook():
    path=ROOT/"Electric Circuits - Year 10 Student Workbook.pdf"
    c=canvas.Canvas(str(path),pagesize=A4,pageCompression=1)
    c.setTitle("Electric Circuits - Year 10 Student Workbook")
    cover(c); roadmap(c,2); toolkit(c,3); triangles(c,4)
    page=5
    for l in LESSONS:
        lesson_first(c,l,page);page+=1
        lesson_second(c,l,page);page+=1
        if l['n'] in [4,6,8]: practical_page(c,l,page);page+=1
        if l['n']==4: wire_graph_page(c,page);page+=1
    exam_pages(c,page);page+=2
    static_extension(c,page);page+=1
    progress(c,page)
    c.save()
    print(f"Workbook: {path} ({page} pages)")

def make_plan(l):
    n=l['n']; name=f"Lesson {n:02d} - {l['title'].replace('/', '-')}"
    md=[f"# Lesson {n}: {l['title']}","",f"**Unit:** Electric Circuits · Year 10 · AQA GCSE Combined Science: Trilogy (Higher) / separate Physics",f"**Specification:** {l['spec']}","**Length:** 50 minutes","", "## Why this lesson is here", "",l['case'],"", "## Learning objective", "",l['mission'],"", "## Core teaching point", "",l['key'],"", "## Equipment and preparation", "",l['equipment'],"", "## Lesson sequence", "", "| Minutes | Phase | Teacher move and evidence to collect |","|---:|---|---|"]
    for start,end,phase,note in l['schedule']: md.append(f"| {start}-{end} | {phase} | {note} |")
    md += ["", "## Workbook task guidance", ""]
    for i,(task,answer) in enumerate(zip(l['tasks'],TASK_ANSWERS[n]),1): md += [f"### Task {i}","",task,"",f"**Expected:** {answer}",""]
    md += ["## Worked example", "",l['worked'],"", "## AQA-style checkpoint", "",l['exam'],"",f"**Mark guidance:** {l['answer']}","", "## Anticipated misconception", "",l['misconception'],"", "## Assessment and next step", "", "Collect one sentence of reasoning and one complete calculation or graph label. Start the next lesson by reteaching the most common error; students who are secure should tackle a changed numerical context.",""]
    if n in [4,6,8]: md += ["## Practical hand-off", "", "Use the workbook practical record for data and graphing. The existing full AQA required-practical worksheet supplies the detailed method, circuit diagrams and additional analysis. Keep apparatus at low voltage and follow local lab safety rules.",""]
    if n==12:
        md += ["## Exam clinic mark guide",""]+[f"- {x}" for x in EXAM_ANSWERS]+[""]
        md += ["## Physics-only extension: static electricity", "", "AQA separate Physics 4.2.5 is outside Trilogy and the site's eight-mission scope. Use the workbook extension page for homework, early finishers or a later separate-Physics lesson. Expected: (1) electrons moved cloth to rod, leaving cloth positive; (2) radial arrows away from a positive sphere, with closer/denser lines near the surface; (3) the negative sphere is in the positive sphere's electric field, opposite charges attract without contact, and the force grows as separation decreases. Sparking is charge moving through air.", ""]
    (PLANS/(name+".md")).write_text("\n".join(md),encoding="utf-8")
    styles=getSampleStyleSheet()
    styles.add(ParagraphStyle(name="TitleX",fontName="Arial-Bold",fontSize=20,leading=24,textColor=NAVY,spaceAfter=12))
    styles.add(ParagraphStyle(name="HeadX",fontName="Arial-Bold",fontSize=11,leading=15,textColor=BLUE,spaceBefore=12,spaceAfter=5))
    styles.add(ParagraphStyle(name="BodyX",fontName="Arial",fontSize=9,leading=13,textColor=INK,spaceAfter=7))
    styles.add(ParagraphStyle(name="SmallX",fontName="Arial",fontSize=8,leading=11,textColor=INK,spaceAfter=4))
    def P(s,sty="BodyX"): return Paragraph(escape(s),styles[sty])
    story=[P(f"Lesson {n}: {l['title']}","TitleX"),P(f"Electric Circuits · Year 10 · 50 minutes · AQA {l['spec']}"),P("Why this lesson is here","HeadX"),P(l['case']),P("Learning objective","HeadX"),P(l['mission']),P("Core teaching point","HeadX"),P(l['key']),P("Equipment and preparation","HeadX"),P(l['equipment']),P("Lesson sequence","HeadX")]
    table_data=[[P("Time","SmallX"),P("Phase","SmallX"),P("Teacher move and evidence","SmallX")]]
    for start,end,phase,note in l['schedule']: table_data.append([P(f"{start}-{end}","SmallX"),P(phase,"SmallX"),P(note,"SmallX")])
    t=Table(table_data,colWidths=[52,105,355],repeatRows=1,hAlign="LEFT")
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),PALE),("GRID",(0,0),(-1,-1),.5,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),7),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),5)]))
    story.append(t); story.append(P("Workbook task guidance","HeadX"))
    for i,(task,answer) in enumerate(zip(l['tasks'],TASK_ANSWERS[n]),1):
        story.extend([P(f"Task {i}: {task}"),P(f"Expected: {answer}","SmallX")])
    story += [P("Worked example","HeadX"),P(l['worked']),P("AQA-style checkpoint","HeadX"),P(l['exam']),P(f"Mark guidance: {l['answer']}"),P("Anticipated misconception","HeadX"),P(l['misconception']),P("Assessment and next step","HeadX"),P("Collect one sentence of reasoning and one complete calculation or graph label. Start the next lesson by reteaching the most common error; students who are secure should tackle a changed numerical context.")]
    if n in [4,6,8]: story += [P("Practical hand-off","HeadX"),P("Use the workbook practical record for data and graphing. The existing full AQA required-practical worksheet supplies detailed method, circuit diagrams and additional analysis. Use low voltage and local lab safety rules.")]
    if n==12:
        story.append(P("Exam clinic mark guide","HeadX"))
        story += [P(x,"SmallX") for x in EXAM_ANSWERS]
        story += [P("Physics-only static electricity extension","HeadX"),P("AQA separate Physics 4.2.5 is outside Trilogy and the site's eight-mission scope. Workbook answers: electrons moved cloth to rod, leaving cloth positive; field arrows point radially out from a positive sphere, denser near it; the negative sphere is attracted by the positive sphere's field, and the force increases as separation decreases. Sparking is charge moving through air.","SmallX")]
    def foot(can,doc):
        can.setFont("Arial",8);can.setFillColor(GREY);can.drawString(42,25,"Electric Circuits · Year 10 Lesson Plan")
        can.drawRightString(W-42,25,str(doc.page))
    doc=SimpleDocTemplate(str(PLANS/(name+".pdf")),pagesize=A4,rightMargin=42,leftMargin=42,topMargin=46,bottomMargin=43,title=name)
    doc.build(story,onFirstPage=foot,onLaterPages=foot)

if __name__=="__main__":
    make_workbook()
    for lesson in LESSONS: make_plan(lesson)
    print("Lesson plans: 12 Markdown masters and 12 PDFs")
