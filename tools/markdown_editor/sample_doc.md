# PanPhy Labs - Markdown & LaTeX Editor

Welcome! 🎉

This lightweight, user-friendly app helps you create simple yet beautiful documents with ease.

With integrated LaTeX support, you can effortlessly include professional-looking math equations and symbols, making it an ideal tool for students and educators. Its clean and intuitive interface lets you concentrate on your writing without distractions.

<br/>

---

# This document is a demo of...

1. a bit of **Markdown**,  
2. a tiny little bit of **LaTeX**, and  
3. a few **HTML** tags.

---

## 1. Markdown

**1.1 Headings**
> # This is a HUGE Heading!
> ### This is not as huge...

**1.2 Lists**
- We can make a list in a list in a list...
    1. Item One ✔️
    2. Item Two ✔️  
        - We can **bold** the text.  
        - We can ~~strikethrough~~ it.  
- We can *italicize* it. (This _italicizes_ it too!)

**1.3 Blockquotes**
> This is a quotation, but it can also be used to indent a text block.
>> And this is a quotation within a quotation. *Because why not?*

**1.4 Code Blocks**

~~~python
# Type your code here.

for i in range(5):
    print(i)
    i = i * 2  # Doubling the fun!
~~~

**1.5 Tables**

| Name | Age | Profession |
|:---|:---:|---:|
| Eddard | 35 | Lord 🐺 |
| Albus | 115 | Wizard 🧙‍♂️|
| Tony | 38 | Inventor 🤖 |

> (*Did you notice how the text alignments are done?*)

**1.6 Links**

- 1.6.1 **Inline Link:**  
> I can insert a [link](https://www.youtube.com) that takes you to the land of endless dog videos. 🐶

- 1.6.2 **Reference Links:**
  - *"[Markdown][1] is a lightweight markup language for creating formatted text using a plain-text editor."* 
  - *"[LaTeX][2] is widely used in academia for the communication and publication of scientific documents and technical note-taking in many fields, owing partially to its support for complex mathematical notation."*

---

## 2. LaTeX

**2.1 Greek Letters**
> *In case you need more symbols...*
>> $\alpha \beta \gamma$
>> if you need some space between them: $\Lambda \space \theta \space \Omega \space \Delta$ 
>> if you want even more space: $\mu \quad \nu \quad \tau \quad \epsilon \quad \psi \quad \rho$

**2.2 Math Expressions**

- 2.2.1 **Inline Examples:**
> Newton's Second Law states that $F=ma$. 
> Absolute zero is $-273 ^\circ{C}$ 🥶.  

- 2.2.2 **Displayed Examples:**

$$ \frac{1}{x} $$
$$ \boxed{M_\odot^2} $$
$$ x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a} $$
$$ \int_{t=-\infty}^{\infty} \ln \frac{1}{t} dt $$
$$ \ddot{x} = \frac{d \dot{x}}{dt} = \frac{d^2x}{dt^2} $$
$$ \left. \frac{\partial{y}}{\partial{t}} \right|_{t=5} $$
$$ \nabla \cdot \vec{D} = \left| \nabla \times \vec{A} \right| = 0 $$
$$ {\lim_{\Delta x \to 0}} \frac{f(x + \Delta x) - f(x)}{\Delta x} $$

| <small>More about $\lim\limits_{\Delta x \to 0}$</small> |
| :--- |
| <small>You need to type <code>\lim\limits_{\Delta x \to 0}</code> for the correct inline version of $ \lim\limits_{\Delta x \to 0} $. If you type <code>\lim_{\Delta x \to 0}</code> inline, you will get $\lim_{\Delta x \to 0}$ instead. (*What's the logic!?* 😑)</small> |

- 2.2.3 **Some more math symbols:**
$$
\begin{array}{|l|l|c|r|r|}
\hline
x^{\prime} & \bar{x} & \hat{x} & \ge & \le \\
\gg & \ll & \ngtr & \nless & \ne \\
\sim & \simeq & \approx & \propto & \because \\
\therefore & \odot & \otimes & \cdot & \times \\
\div & \infty & \Leftrightarrow & \Longleftrightarrow & \Rightarrow \\
\leftarrow & \rightarrow & \to & \leftrightharpoons & \hbar \\
\triangle & \sum & \prod & \int & \oint \\
\hline
\end{array}
$$

> This also shows a LaTeX way to create a table. Note the code <code>{|l|l|c|r|r|}</code>, which appears immediately after <code>\begin{array}</code>. Each of the letters in <code>{|l|l|c|r|r|}</code> represents a column and indicates how the entries in that column should be aligned (left, left, center, right, right).

- 2.2.4 **Matrices**
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

- 2.2.5 **Equation Alignment**
$$
\begin{aligned}
\because ax^2 + b^2 + c &= 0 \\
\therefore x &= \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
\end{aligned}
$$

- 2.2.6 **Bracket Size**
$$ \left( \frac{1}{\sqrt[n]{2}} \right) \space \text{vs} \space ( \frac{1}{\sqrt[n]{2}} ) $$
> (*Size does matter... sometimes.*)

**2.3 Chemical Equations**
$$
{Na_{(aq)}}^+ + {Cl_{(aq)}}^- \longrightarrow NaCl_{(s)}
$$

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
    
