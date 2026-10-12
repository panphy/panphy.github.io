# IB DP Physics

Resources for the IB Diploma Programme Physics course (first assessment 2025), organised by the syllabus topics in the subject guide.

**Address:** <https://panphy.app/ibdpphy/>

## Files

| File | Use |
|---|---|
| `index.html` | Hub page. Its syllabus map lists themes A to E; a theme becomes a link once it has resources |
| `course-summary/` | One-page summary of the subject guide: hours, the content and equations of every topic at SL and HL, the practical programme and assessment. Paraphrased and shortened; the guide is the authority |
| `data-booklet/` | Annotated data booklet: `booklet.js` holds the constants, conversions, mathematical equations and diagrams and builds the page; `booklet.css` styles it |
| `assets/equations.js` | The equations of every topic as LaTeX with a meaning for each symbol, used by both reference pages; it also typesets them and shows the explanations |
| `assets/page.css` | Styles shared by those two reference pages, light and dark, including the equation lists |
| `decks/a1-kinematics/` | A.1 teaching deck, 41 slides: SL and HL, with no additional HL content |
| `decks/e1-structure-of-the-atom/` | E.1 teaching deck, 41 slides: SL and HL, then an additional HL part (slides 28 to 40) |
| `decks/e2-quantum-physics/` | E.2 teaching deck, 34 slides: HL only |
| `decks/assets/deck.css`, `deck.js`, `figures.js`, `deck-math.js` | Styles, slide engine, SVG diagrams and MathJax setup shared by every deck here |
| `decks/assets/deck-notes.css`, `deck-notes.js` | The note pane under each slide, copied unchanged from `gcsephy/decks/assets/` |
| `sw.js`, `sw-register.js` | Freshness worker for `/ibdpphy/`, a copy of the `gcsephy/` pair; keep the two in step |

## Reference pages

The equations are data: in `assets/equations.js` each topic lists its equations and a `syms` dictionary, and every symbol found in the dictionary gets an explanation on hover, focus or tap. Write a symbol in `syms` exactly as it appears in the equation (`'F_\\mathrm{f}'`), and give an equation its own `syms` where a letter means something different there. The booklet shows every topic; the course summary, otherwise plain HTML, shows a topic's equations wherever it has `<div data-eqs="A.1 sl"></div>` (`hl` for the additional HL ones, placed inside the terracotta block), so an equation is edited once for both pages.

No equation scrolls sideways. Each is typeset in parts, split before every top-level `=`, and the parts wrap; a part still wider than its column is scaled down. Keep a row to one relation where you can: a long chain or a “where” clause reads better as two rows. The booklet follows version 1.2 (updated November 2023), the latest the author holds; when the IB revises the booklet or the guide, update the page, its version line and the course summary together. Both are the IB's copyright, so these pages explain and summarise and do not reproduce their text.

## Marking higher level content

Terracotta (`--hl`, with `--hl-text` where it is text on paper) means higher level only and is used for nothing else. The other colours come from the same palette: slate `#2C4654`, teal `#4F9C8F`, sage `#96B083`, sand `#E2C678`, apricot `#E8A66C` and terracotta `#D87759`.

- A slide that is additional HL has the class `hl` on its `<section>`. That gives it the terracotta edge, the "HL only" flag and a terracotta footer, and tags its thumbnail.
- Write the footer of such a slide as `… · ADDITIONAL HL` (or `… · HL ONLY` in a topic with no SL content) and of every other slide as `… · SL + HL`.
- One HL item on a mixed slide takes `<span class="hl-tag">HL only</span>`; a summary card takes `class="term hl"` or `class="card hl"`.
- On the hub, a resource that is HL only uses `class="card t-deck hl"` and `<span class="level hl">`.

## Editing a deck

Each slide is a `<section class="slide">` in the deck's `index.html`; a diagram is `<div class="fig" data-fig="name">`, drawn by the function of that name in `decks/assets/figures.js`. A student note goes inside the slide as `<aside class="revision-note" hidden>`. Maths is LaTeX between `\(` and `\)`, typeset by MathJax as in PanPhy Markdown (`decks/assets/deck-math.js` holds the setup); `\class{res}{…}` colours a result. Write a division as a fraction (`\frac`, or `\dfrac` in worked examples), never with ÷. Labels inside the SVG diagrams are plain text, not LaTeX. MathJax comes from the same CDN address as PanPhy Markdown; if it cannot load, the deck still opens and shows the LaTeX source.

The atom diagrams and eleven slides of E.1 began as copies from `gcsephy/decks/atoms-and-radiation/`. The two decks are now separate: a change to one does not reach the other. The story-slide photographs in `decks/e1-structure-of-the-atom/images/` are copies too, and their credits and the history dates follow the table in [`gcsephy/year11phy/unit01/README.md`](../gcsephy/year11phy/unit01/README.md).

E.1's HL part has three more story slides (29, 33 and 36: Rutherford's estimate of the nucleus, Hofstadter's electron scattering from 1953 as on his Nobel page, and Balmer's formula of 1885, which has no Nobel page and is dated by his paper). Their photographs are from Wikimedia Commons, public domain except the hydrogen tube (CC BY 4.0) and the photographed spectrum (CC0).

E.2 has five story slides (8, 12, 17, 20 and 27) with photographs in `decks/e2-quantum-physics/images/`, all from Wikimedia Commons and either public domain or CC BY 4.0 (Thomson's camera and diffraction photograph, Science Museum Group). Each has a caption and a credit linking to its source; change a photo and its credit together. Their dates follow the laureates' pages on nobelprize.org (checked 12 October 2026): Einstein's light quanta 1905, Millikan's test 1912–1915 (published 1916), de Broglie's thesis 1924, electron diffraction 1927, and Compton's discovery 1922 (published 1923, the date on the Compton slides that follow).

A.1 has three story slides (7, 18 and 24) with photographs in `decks/a1-kinematics/images/`, all from Wikimedia Commons: public domain except the inclined plane (Museo Galileo, CC BY-SA 4.0). Their facts were checked on 12 October 2026 against the sources named here. Muybridge’s horse: the printed card itself gives 19 June 1878, Palo Alto, and frames 27 inches and about 1/25 s apart; the dozen cameras are from the description of the Library of Congress print on Commons. Galileo: the inclined plane is a demonstration model of the early 19th century, described in the Museo Galileo catalogue (inv. 1041), and *Two New Sciences* was published in 1638. Apollo 15: the date, 2 August 1971, is from the NASA Johnson Space Center caption (S71-43788), and the 1.32 kg hammer and drop of about 1.6 m from the NSSDCA page quoting the mission’s Preliminary Science Report; that page doubts the report’s mass for the feather, so the slide gives none.

A.1’s worked examples use `g` = 9.8 m s⁻², the data booklet value; its diagrams are the `// ---- A.1: kinematics ----` block of `figures.js`, which never uses terracotta because nothing in A.1 is HL only.

Constants are the values in the 2025 data booklet (checked 12 October 2026): `h` = 6.63 × 10⁻³⁴ J s, `hc` = 1.24 × 10⁻⁶ eV m, `k` = 8.99 × 10⁹ N m² C⁻², `e` = 1.60 × 10⁻¹⁹ C, `u` = 1.661 × 10⁻²⁷ kg, electron mass 9.11 × 10⁻³¹ kg and Fermi radius `R₀` = 1.20 × 10⁻¹⁵ m. Worked examples carry rounded values forward exactly as shown on the slide, so recheck every line of an example after changing one number.

After adding or removing slides, update the slide counts here and on the hub cards.
