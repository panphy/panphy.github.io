# PanPhyMD - Markdown & LaTeX Editor

Welcome! 🎉

This lightweight app helps you write clean notes and reports with **Markdown**, and type proper **maths and Greek letters** with **LaTeX**. It is made for students and teachers of physics, but works for any subject.

Switch between **Edit** (the text you type) and **Preview** (what you get), or see both side by side on a wide screen. Every example below can be copied and changed.

<br/>

---

# This document is a demo of...

1. a bit of **Markdown**,  
2. a lot of **LaTeX** (maths, Greek letters, units, physics, chemistry and more), and  
3. a few **HTML** tags.

---

## 1. Markdown

**1.1 Headings, bold and italics**
> # This is a HUGE Heading!
> ### This is not as huge...

- We can make a **bold** word, an *italic* word (or an _italic_ one) and ~~strike through~~ a word.
- Lists can go inside lists:
    1. Item One ✔️
    2. Item Two ✔️  
        - Sub-item A
        - Sub-item B

**1.2 Blockquotes**
> This is a quotation, but it can also be used to indent a text block.
>> And this is a quotation within a quotation. *Because why not?*

**1.3 Code Blocks**

~~~python
# Type your code here.

for i in range(5):
    print(i)
    i = i * 2  # Doubling the fun!
~~~

**1.4 Tables**

| Name | Age | Profession |
|:---|:---:|---:|
| Eddard | 35 | Lord 🐺 |
| Albus | 115 | Wizard 🧙‍♂️|
| Tony | 38 | Inventor 🤖 |

> (*Did you notice how the text alignments are done? Look at the `:---:` line.*)

**1.5 Links**

- **Inline link:** I can insert a [link](https://www.youtube.com) that takes you to the land of endless dog videos. 🐶
- **Reference links:**
  - *"[Markdown][1] is a lightweight markup language for creating formatted text using a plain-text editor."*
  - *"[LaTeX][2] is widely used in academia for the communication and publication of scientific documents and technical note-taking in many fields, owing partially to its support for complex mathematical notation."*

---

## 2. LaTeX

**2.1 The basics: how to type maths**

> *The golden rule: wrap your maths in **dollar signs**. That's the magic! ✨*

| You type | You get |
|:---|:---|
| `$F = ma$` | $F = ma$ |
| `$$ F = ma $$` | (centred on its own line, see below) |

$$ F = ma $$

- **One `$` on each side** keeps the maths **inline**, right in the middle of a sentence: Newton's Second Law states that $F=ma$.
- **Two `$$` on each side** makes a **displayed** equation on its own line. Perfect for the important (or tall) ones.
- Special symbols start with a **backslash `\`** and are **case-sensitive**: `\delta` gives $\delta$ but `\Delta` gives $\Delta$. (*Yes, capital letters matter!*)
- **Spaces are ignored** inside maths, so add your own with `\,` (thin), `\;` (medium) or `\quad` (wide): $a\,b$, $a\;b$, $a\quad b$.
- **Braces `{ }` group things together.** Anything longer than one character needs them (more in 2.3).
- Need a real dollar sign? Type `\$`. For example: it costs \$5 and \$10. 💰

**2.2 Greek letters**

> *Time to meet the whole Greek alphabet. Physicists use these all the time!*

Type a backslash and the **name** of the letter. For a capital letter, **capitalise the first letter** of the name.

| Name | Lower case | Code | Capital | Code |
|:---|:---:|:---|:---:|:---|
| alpha | $\alpha$ | `\alpha` | $A$ | `A` |
| beta | $\beta$ | `\beta` | $B$ | `B` |
| gamma | $\gamma$ | `\gamma` | $\Gamma$ | `\Gamma` |
| delta | $\delta$ | `\delta` | $\Delta$ | `\Delta` |
| epsilon | $\varepsilon$ | `\varepsilon` | $E$ | `E` |
| zeta | $\zeta$ | `\zeta` | $Z$ | `Z` |
| eta | $\eta$ | `\eta` | $H$ | `H` |
| theta | $\theta$ | `\theta` | $\Theta$ | `\Theta` |
| kappa | $\kappa$ | `\kappa` | $K$ | `K` |
| lambda | $\lambda$ | `\lambda` | $\Lambda$ | `\Lambda` |
| mu | $\mu$ | `\mu` | $M$ | `M` |
| nu | $\nu$ | `\nu` | $N$ | `N` |
| xi | $\xi$ | `\xi` | $\Xi$ | `\Xi` |
| pi | $\pi$ | `\pi` | $\Pi$ | `\Pi` |
| rho | $\rho$ | `\rho` | $P$ | `P` |
| sigma | $\sigma$ | `\sigma` | $\Sigma$ | `\Sigma` |
| tau | $\tau$ | `\tau` | $T$ | `T` |
| upsilon | $\upsilon$ | `\upsilon` | $\Upsilon$ | `\Upsilon` |
| phi | $\varphi$ | `\varphi` | $\Phi$ | `\Phi` |
| chi | $\chi$ | `\chi` | $X$ | `X` |
| psi | $\psi$ | `\psi` | $\Psi$ | `\Psi` |
| omega | $\omega$ | `\omega` | $\Omega$ | `\Omega` |

> *Plot twist...*
>> - Some capital Greek letters look exactly like English capitals (Alpha is just $A$), so they have **no command**. Just type the English letter! 🤷
>> - A few letters have two shapes: `\epsilon` gives $\epsilon$ but `\varepsilon` gives $\varepsilon$ (the one used for $\varepsilon_0$), and `\phi` gives $\phi$ but `\varphi` gives $\varphi$. Likewise `\theta` $\theta$ and `\vartheta` $\vartheta$, `\rho` $\rho$ and `\varrho` $\varrho$.
>> - Physics favourites: $\theta$ angle, $\lambda$ wavelength, $\mu$ micro / friction, $\omega$ angular speed, $\rho$ density, $\sigma$ Stefan–Boltzmann constant / stress, $\tau$ torque / time constant, $\Delta$ change in, $\Omega$ ohm.

**2.3 Powers, subscripts, fractions and roots**
> *The bread and butter of physics equations. Watch out for the braces!*

| You type | You get | Note |
|:---|:---|:---|
| `$x^2$` | $x^2$ | `^` raises (superscript) |
| `$x_1$` | $x_1$ | `_` lowers (subscript) |
| `$x^{10}$` | $x^{10}$ | **braces** for more than one character |
| `$x^10$` | $x^10$ | ❌ without braces only the `1` is raised |
| `$v_{0x}$` | $v_{0x}$ | subscript with more than one character |
| `$x_i^2$` | $x_i^2$ | both together |
| `$\frac{a}{b}$` | $\frac{a}{b}$ | fraction: top, then bottom |
| `$\sqrt{x}$` | $\sqrt{x}$ | square root |
| `$\sqrt[3]{x}$` | $\sqrt[3]{x}$ | cube root |
| `$e^{-t/\tau}$` | $e^{-t/\tau}$ | brace content can be anything |

**2.4 Physics examples**

> *Your formula sheet, but prettier. Copy, tweak, and make them your own!* 📝

**Mechanics**

$$ v = u + at $$

$$ v^2 - u^2 = 2as $$

$$ s = ut + \frac{1}{2}at^2 $$

$$ E_\mathrm{k} = \frac{1}{2}mv^2 \qquad\qquad E_\mathrm{p} = mgh \qquad\qquad W = Fs\cos\theta $$

$$ F = G\frac{Mm}{r^2} $$

**Waves, electricity and light**

$$ v = f\lambda \qquad\qquad T = \frac{1}{f} \qquad\qquad n = \frac{\sin\theta_1}{\sin\theta_2} $$

$$ V = IR \qquad\qquad P = IV = I^2R = \frac{V^2}{R} $$

$$ F = \frac{1}{4\pi\varepsilon_0}\frac{Q_1Q_2}{r^2} $$

**Modern physics**

$$ E = mc^2 \qquad\qquad E = hf \qquad\qquad \lambda = \frac{h}{p} $$

**Vectors and change**

- A vector gets an arrow: $\vec{F}$, $\vec{v}$, $\vec{a}$. A unit vector gets a hat: $\hat{i}$, $\hat{j}$, $\hat{k}$.
- A *change in* a quantity uses a capital delta: $\Delta x$, $\Delta t$, so $v = \dfrac{\Delta x}{\Delta t}$.

$$ \vec{r} = 5\hat{i} + 8\hat{j} \qquad\qquad |\vec{r}| = \sqrt{5^2 + 8^2} $$

> Inline fractions get squashed, like this: $\frac{\Delta x}{\Delta t}$. Use `\dfrac` instead of `\frac` for a full-size fraction in a sentence: $\dfrac{\Delta x}{\Delta t}$. (*Much better!*)

**2.5 Units and numbers**

> *Units are not variables, so they stand up straight! Wrap them in `\mathrm{ }` to keep them upright, and add a thin space `\,` before the unit.*

| You type | You get |
|:---|:---|
| `$v = 3.0 \times 10^{8}\,\mathrm{m\,s^{-1}}$` | $v = 3.0 \times 10^{8}\,\mathrm{m\,s^{-1}}$ |
| `$g = 9.81\,\mathrm{m\,s^{-2}}$` | $g = 9.81\,\mathrm{m\,s^{-2}}$ |
| `$R = 4.7\,\mathrm{k\Omega}$` | $R = 4.7\,\mathrm{k\Omega}$ |
| `$\mu = 1.2\,\mu\mathrm{m}$` | $\mu = 1.2\,\mu\mathrm{m}$ |
| `$T = -273\,^\circ\mathrm{C}$` | $T = -273\,^\circ\mathrm{C}$ |
| `$\theta = 30^\circ$` | $\theta = 30^\circ$ |
| `$E_\mathrm{k}$` and `$E_k$` | $E_\mathrm{k}$ and $E_k$ |
| `$\pm 0.5\%$` | $\pm 0.5\%$ |

> Use `\times` for "times", not the letter x: `5 \times 10^3` gives $5 \times 10^3$. And use `\text{ words }` for ordinary words inside maths: $v = 5 \text{ when } t = 2$. (*Yes, you can write words in maths!*)

**2.6 Chemical and nuclear equations**

> *Chemistry? Physics? Why not both!* ⚗️

**Chemical equations:** put the whole formula in `\mathrm{ }` to keep the letters upright.

$$ \mathrm{Na^+_{(aq)} + Cl^-_{(aq)} \longrightarrow NaCl_{(s)}} $$

$$ \mathrm{CH_4 + 2O_2 \longrightarrow CO_2 + 2H_2O} $$

**Nuclear equations:** put `{}` in front, then the mass number as a superscript `^` and the proton number as a subscript `_`, then the symbol in `\mathrm{ }`.

- `{}^{14}_{6}\mathrm{C}` gives ${}^{14}_{6}\mathrm{C}$

Alpha decay:

$$ {}^{238}_{92}\mathrm{U} \longrightarrow {}^{234}_{90}\mathrm{Th} + {}^{4}_{2}\mathrm{He} $$

Beta-minus decay (a neutron becomes a proton, plus an electron and an antineutrino, written with `\bar{\nu}_e`):

$$ {}^{14}_{6}\mathrm{C} \longrightarrow {}^{14}_{7}\mathrm{N} + {}^{\;\;0}_{-1}\mathrm{e} + \bar{\nu}_e $$

Beta-plus decay (a proton becomes a neutron, plus a positron and a neutrino):

$$ {}^{22}_{11}\mathrm{Na} \longrightarrow {}^{22}_{10}\mathrm{Ne} + {}^{\;\;0}_{+1}\mathrm{e} + \nu_e $$

> (*Quick check: the **top numbers** (nucleon number) add up to the same total on both sides, and so do the **bottom numbers** (charge). If they don't, something is off!* ☢️)

**2.7 Symbols cheat-sheet**
> *In case you need more symbols... bookmark this one!* 🔖

**Relations and operators**

| Symbol | Code | Symbol | Code | Symbol | Code |
|:---:|:---|:---:|:---|:---:|:---|
| $\ne$ | `\ne` | $\approx$ | `\approx` | $\propto$ | `\propto` |
| $\le$ | `\le` | $\ge$ | `\ge` | $\sim$ | `\sim` |
| $\ll$ | `\ll` | $\gg$ | `\gg` | $\pm$ | `\pm` |
| $\times$ | `\times` | $\div$ | `\div` | $\cdot$ | `\cdot` |
| $\therefore$ | `\therefore` | $\because$ | `\because` | $\infty$ | `\infty` |

**Arrows, calculus and others**

| Symbol | Code | Symbol | Code | Symbol | Code |
|:---:|:---|:---:|:---|:---:|:---|
| $\to$ | `\to` | $\Rightarrow$ | `\Rightarrow` | $\Leftrightarrow$ | `\Leftrightarrow` |
| $\rightleftharpoons$ | `\rightleftharpoons` | $\sum$ | `\sum` | $\prod$ | `\prod` |
| $\int$ | `\int` | $\oint$ | `\oint` | $\partial$ | `\partial` |
| $\nabla$ | `\nabla` | $\hbar$ | `\hbar` | $\odot$ | `\odot` |
| $\bar{x}$ | `\bar{x}` | $\hat{x}$ | `\hat{x}` | $\dot{x}$ | `\dot{x}` |
| $\ddot{x}$ | `\ddot{x}` | $\vec{x}$ | `\vec{x}` | $x^{\prime}$ | `x^{\prime}` |

**2.8 Going further: calculus, brackets, matrices and alignment**

**Calculus**

$$ \frac{dy}{dx} \qquad \frac{d^2x}{dt^2} \qquad \left. \frac{\partial y}{\partial t} \right|_{t=5} $$

$$ \int_{0}^{\infty} e^{-ax}\,dx = \frac{1}{a} $$

$$ \lim_{\Delta x \to 0} \frac{f(x + \Delta x) - f(x)}{\Delta x} $$

| <small>More about limits</small> |
| :--- |
| <small>Type <code>\lim\limits_{\Delta x \to 0}</code> to place the limit underneath the word in an inline sentence, as in $\lim\limits_{\Delta x \to 0} f(x)$. If you type <code>\lim_{\Delta x \to 0}</code> inline, the limit is squashed to the side instead: $\lim_{\Delta x \to 0} f(x)$. In a displayed equation, both give the nice version. (*What's the logic!?* 😑)</small> |

**Bracket size.** `\left(` and `\right)` make the brackets grow to fit what is inside. (*Size does matter... sometimes.*)

$$ \left( \frac{1}{\sqrt[n]{2}} \right) \quad \text{vs} \quad ( \frac{1}{\sqrt[n]{2}} ) $$

**Equation alignment.** Use `aligned`, put `&` where lines should line up, and `\\` to start a new line.

$$
\begin{aligned}
ax^2 + bx + c &= 0 \\
x &= \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
\end{aligned}
$$

**Matrices**

$$
\begin{pmatrix}
a & b & c \\
d & e & f \\
g & h & i \\
\end{pmatrix}
\cdot
\begin{vmatrix}
\alpha & \beta \\
\gamma & \delta \\
\end{vmatrix} =
\begin{bmatrix}
A_{11} & A_{12} & A_{13} \\
A_{21} & A_{22} & A_{23} \\
A_{31} & A_{32} & A_{33} \\
\end{bmatrix}
$$

**A table in LaTeX.** The `{|l|l|c|r|}` after `\begin{array}` sets the alignment of each column (left, left, centre, right) and the `|` draws the lines.

$$
\begin{array}{|l|l|c|r|}
\hline
\text{Quantity} & \text{Symbol} & \text{Value} & \text{Unit} \\
\hline
\text{Speed of light} & c & 3.00 \times 10^{8} & \mathrm{m\,s^{-1}} \\
\text{Planck constant} & h & 6.63 \times 10^{-34} & \mathrm{J\,s} \\
\text{Elementary charge} & e & 1.60 \times 10^{-19} & \mathrm{C} \\
\hline
\end{array}
$$

**2.9 University-level examples**
> *Feeling brave? Here is a sneak peek of what's coming at university...* 🎓

**Vector calculus and electromagnetism: Maxwell's equations**

$$
\begin{aligned}
\nabla \cdot \vec{E} &= \frac{\rho}{\varepsilon_0} &
\nabla \cdot \vec{B} &= 0 \\
\nabla \times \vec{E} &= -\frac{\partial \vec{B}}{\partial t} &
\nabla \times \vec{B} &= \mu_0 \vec{J} + \mu_0\varepsilon_0 \frac{\partial \vec{E}}{\partial t}
\end{aligned}
$$

$$ \oint_C \vec{B} \cdot d\vec{l} = \mu_0 I_{\text{enc}} $$

**Quantum mechanics**

$$ i\hbar \frac{\partial}{\partial t}\Psi(x,t) = \hat{H}\Psi(x,t) $$

$$ \langle \psi | \phi \rangle = \int_{-\infty}^{\infty} \psi^*(x)\,\phi(x)\,dx \qquad\qquad \Delta x\,\Delta p \ge \frac{\hbar}{2} $$

**Relativity**

$$ \gamma = \frac{1}{\sqrt{1 - \dfrac{v^2}{c^2}}} \qquad\qquad t' = \gamma\left(t - \frac{vx}{c^2}\right) $$

**Statistical physics and probability**

$$ P(E) \propto e^{-E/k_\mathrm{B}T} \qquad\qquad f(x) = \frac{1}{\sigma\sqrt{2\pi}}\,e^{-\frac{(x-\mu)^2}{2\sigma^2}} $$

**Series and sums**

$$ f(x) = \frac{a_0}{2} + \sum_{n=1}^{\infty} \left[ a_n\cos(nx) + b_n\sin(nx) \right] $$

**2.10 Common mistakes**
> *Oops! These slip-ups happen to everyone. Can you spot the difference?* 🙈

| You typed | You get | Better | You get |
|:---|:---|:---|:---|
| `$sin x$` | $sin x$ | `$\sin x$` | $\sin x$ |
| `$x^10$` | $x^10$ | `$x^{10}$` | $x^{10}$ |
| `$v_max$` | $v_max$ | `$v_\mathrm{max}$` | $v_\mathrm{max}$ |
| `$5 x 10^3$` | $5 x 10^3$ | `$5 \times 10^3$` | $5 \times 10^3$ |
| `$3 m/s$` | $3 m/s$ | `$3\,\mathrm{m\,s^{-1}}$` | $3\,\mathrm{m\,s^{-1}}$ |
| `$Delta x$` | $Delta x$ | `$\Delta x$` | $\Delta x$ |
| `$\mu m$` | $\mu m$ | `$\mu\mathrm{m}$` | $\mu\mathrm{m}$ |
| `$H2O$` | $H2O$ | `$\mathrm{H_2O}$` | $\mathrm{H_2O}$ |

> Forgot a closing `$`? Then your maths shows up as plain text. Forgot a closing `}`? Every `{` needs its partner! (*Brackets are lonely.* 😅)

---

## 3. HTML

**3.1 Page Break**
- Want to start a new page in your PDF this app prints? Just add the following line wherever you’d like a fresh page to begin!

> <code> \<div class="page-break"\>\<\/div\> </code>

> (Don't worry! It does nothing in the HTML this app exports! 😉)

<div class="page-break"></div>

**3.2 Line Break**
- Can you find the line breaks I made with <code>\<br\/></code> in this document?

<br/>

**3.3 Inserting Pictures** (and their alignment)
- Let's insert a picture below...

<p style="text-align: center;"><img src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Hong_Kong_Island_Skyline_201108.jpg" alt="" style="width: 60%; height: auto;" /></p>

<p align="center">
    Fig. 1 - This is the caption. What a nice photo of Hong Kong!
</p>

---

**And there you have it! 🏆**

A brief tour through **Markdown**, **LaTeX**, and **HTML**. Happy writing and editing! May your documents be ever stylish!

[1]: https://en.wikipedia.org/wiki/Markdown "Markdown"  
[2]: https://en.wikipedia.org/wiki/LaTeX "LaTeX"
