---
# Feature showcase: every capability of the template on a few pages.
# Build all themes/feels with: .\build-all.ps1 -Source demo.md

header:
  style: band
  start: "نمونهٔ امکانات قالب"
  center: "{section-number}. {section}"
  end: "صفحه {page} از {pages}"
  dir: auto
  skip-first-page: false

footer:
  style: plain
  start: ""
  end: "— {page} —"
  digits: fa

cover:
  institution: "دانشگاه نمونه"
  faculty: "دانشکدهٔ مهندسی کامپیوتر"
  type: "سند نمایشی قالب"
  title: "نمونهٔ کامل امکانات قالب"
  subtitle: "Markdown دوزبانه، از متن ساده تا رسم و ارجاع"
  author: "نام نویسنده"
  supervisor: ["دکتر الف", "دکتر ب"]
  advisor: "دکتر ج"
  date: "مهر ۱۴۰۵"
  frame: true

bibliography:
  file: examples/references.bib
  style: ieee                      # any Typst/CSL style: apa, chicago-author-date, ...
  title: "منابع"
  dir: auto                        # auto (each entry by its own language) | ltr | rtl
---

<toc break="true"></toc>

<lof></lof>

<lot></lot>

<lol break="after"></lol>

## جهت متن و قالب‌بندی {#direction}

<docheader title="بلوک عنوان *docheader*" subtitle="زیرعنوان با ریاضی $E = mc^2$"></docheader>

این پاراگراف فارسی است و راست‌به‌چپ چیده می‌شود؛ کلمه‌های انگلیسی مثل Typst و `inline code` و ریاضی $a^2 + b^2 = c^2$ وسط آن جهت را عوض نمی‌کنند. متن **پررنگ**، *کج* و [پیوند](https://typst.app) هم کار می‌کنند.

This paragraph starts with an English word, so it is laid out left-to-right, even though it contains Persian words like «سلام».

&rlm;Python با اینکه با کلمهٔ انگلیسی شروع شده، به لطف علامت RLM در ابتدایش راست‌به‌چپ است.

### پیوندها {#links}

پیوند Markdown به [مستندات Typst](https://typst.app/docs)، پیوند با تگ <a href="https://github.com/typst/typst">مخزن Typst در GitHub</a> و پیوند داخلی با `#id` به <a href="#includes">بخش درج فایل‌ها</a>.

Links in English: [the cmarker package](https://typst.app/universe/package/cmarker), an <a href="https://www.w3.org/International/">HTML anchor</a>, and a bare URL <https://typst.app>.

### تیتر با تنظیمات خودش {#heading-options fill=true underline=false color=purple}

هر تنظیم بخش `[heading]` را می‌شود فقط برای یک تیتر، در همان `{...}` که شناسه می‌گیرد، عوض کرد. این تیتر، هرچه تنظیم سراسری باشد، پس‌زمینهٔ بنفش و بدون خط زیر دارد:

```markdown
### تیتر با تنظیمات خودش {#heading-options fill=true underline=false color=purple}
#### تیتر بدون شماره {numbering=false color=teal}
#### تیتر بی‌شماره و بیرون از فهرست {numbering=false toc=false}
```

#### تیتر بدون شماره {numbering=false color=teal}

تیتر بالا شماره نگرفته و شمارهٔ تیترهای بعدی هم جابه‌جا نمی‌شود.

#### تیتر بی‌شماره و بیرون از فهرست {numbering=false toc=false}

این تیتر با `toc=false` در `<toc>` نیامده است. ارجاع به تیتر بنفش: <ref to="heading-options"></ref>.

### &rlm;Markdown در تیترها {#rlm-heading}

- مورد اول لیست فارسی
- &rlm;Docker با RLM بعد از نشانهٔ لیست
- مورد سوم با ریاضی $\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$

1. First English item
2. Second item with `code`

> نقل‌قول فارسی: نوار آن در سمت راست قرار می‌گیرد.

> An English quote: its bar sits on the left.

ریاضی نمایشی (بدون شماره):

$$\int_0^\infty e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2}$$

معادلهٔ شماره‌دار یک‌خطی و چندخطی با `{#id}`:

$$e^{i\pi} + 1 = 0$$ {#eq-euler}

$$
\sum_{k=1}^{n} k^2 = \frac{n(n+1)(2n+1)}{6}
$$ {#eq-squares}

ارجاع به <ref to="eq-euler"></ref> و <ref to="eq-squares"></ref>؛ 

And in English: <ref to="eq-euler"></ref>.

میان‌برها و برچسب‌ها: برای باز کردن پالت <kbd>Ctrl+Shift+P</kbd> و برای ذخیره <kbd>Ctrl+S</kbd> را بزنید. وضعیت: <badge color="green" icon="circle-check">پایدار</badge> <badge color="yellow">beta</badge> <badge color="red" icon="bug">باگ</badge> <badge>خنثی</badge>.

Press <kbd>Alt</kbd> + <kbd>F4</kbd> to quit. Status: <badge color="blue" icon="code-branch">v2.1</badge> <badge color="purple">new</badge>.

هایلایت متن: <span highlight="true">زرد</span>، <span highlight="green">سبز</span> و یک عبارت بلند که می‌شکند <span highlight="blue">و روی دو خط یک نوار پیوسته می‌ماند تا ببینیم درست کار می‌کند</span>. In English: [pink]{highlight=pink} (Markdown form), <span highlight="pink">pink</span> and <span id="hl-demo" highlight="orange">orange with an id</span> (<ref to="hl-demo"></ref>).

آیکن وسط جمله: انجام شد <icon name="check" color="green" />، هشدار <icon name="triangle-exclamation" color="orange" /> و ستاره <icon name="star" solid="true" color="yellow" />.

<dir ltr>
فاصلهٔ عمودی با <v> بین دو پاراگراف:

<v size="1.5cm" />

و ادامهٔ متن بعد از فاصله.

In English: saved <icon name="floppy-disk" />, failed <icon name="circle-xmark" color="red" />, repo <icon name="github" color="slate" />.
</dir>
 
### پاورقی‌ها {#footnotes}

پاورقی معادل اصطلاحات انگلیسی: <fn en="Artificial Intelligence">هوش مصنوعی</fn> و یادگیری ماشین<fn en="Machine Learning"></fn>.

پاورقی فارسی استاندارد[^fn-fa] و پاورقی به زبان انگلیسی[^fn-en] با نحو استاندارد Markdown:

[^fn-fa]: این یک پاورقی توضیحی به زبان فارسی است.
[^fn-en]: This is an explanatory footnote in English.

---

## کد

یک خطی (بدون خط خالی اضافه در انتها):

```nginx
include /etc/nginx/sites-enabled/*;
```

با نام مستعار زبان (`py`) و خط خالی وسط:

```py
def greet(name):

    return f"سلام {name}"
```

```js
const total = items.reduce((sum, x) => sum + x.price, 0);
```

زبان ناشناخته و بدون زبان:

```foo
some unknown language
```

```
no language, no badge
```

کد از فایل، فقط خطوط ۶ تا ۱۶، با خطوط هایلایت‌شده و کپشن (<ref to="code-fib"></ref>):

<code src="examples/sample.py" lines="6-16" highlight="9-10,15" caption="فیبوناچی با کش" id="code-fib"></code>

هایلایت روی یک بلوک کد معمولی:

<code highlight="2">

```js
const a = 1;
const b = a + 1; // this line is highlighted
console.log(b);
```

</code>

### مقایسه تغییرات (Diff) {#diff-showcase}

تغییرات درون‌خطی با `<del>` و `<ins>`: این مقدار <del>قدیمی و منسوخ</del> به مقدار جدید <ins>بهینه‌سازی‌شده</ins> ارتقا یافت.

دو نسخهٔ کد را بدهید؛ تغییرات خودکار پیدا می‌شوند. حالت پیش‌فرض کنار هم (`split`) است:

<diff caption="مقایسه پیاده‌سازی تابع بازگشتی و تکراری" id="diff-fact">
<before title="نسخه بازگشتی (قدیم)">

```python
def fact(n):
    """n! به روش بازگشتی"""
    if n <= 1:
        return 1
    return n * fact(n - 1)

print(fact(5))
```

</before>
<after title="نسخه تکراری با کش (جدید)">

```python
from functools import lru_cache

@lru_cache(maxsize=None)
def fact(n):
    """n! به روش تکراری"""
    res = 1
    for i in range(2, n + 1):
        res *= i
    return res

print(fact(5))
```

</after>
</diff>

همان دو نسخه در حالت یکپارچه (`mode="unified"`): یک بلوک کد معمولی با خطوط حذف‌شده قرمز و افزوده سبز:

<diff mode="unified">
<before>

```python
def fact(n):
    """n! به روش بازگشتی"""
    if n <= 1:
        return 1
    return n * fact(n - 1)

print(fact(5))
```

</before>
<after>

```python
from functools import lru_cache

@lru_cache(maxsize=None)
def fact(n):
    """n! به روش تکراری"""
    res = 1
    for i in range(2, n + 1):
        res *= i
    return res

print(fact(5))
```

</after>
</diff>

فایل تنظیمات، بدون عنوان (عنوان‌های پیش‌فرض):

<diff caption="به‌روزرسانی تنظیمات سرور" id="diff-unified">
<before>

```toml
[server]
port = 8080
workers = 2
debug = false
```

</before>
<after>

```toml
[server]
port = 9000
workers = 8
timeout = 30
debug = false
```

</after>
</diff>

---

## جدول‌ها

جدول پیش‌فرض (عرض از `[table]` در کانفیگ) با چینش ستون‌ها:

| زبان | سال انتشار | کاربرد اصلی |
| :--- | :---: | ---: |
| Python | ۱۹۹۱ | علم داده و اسکریپت |
| Rust | ۲۰۱۵ | سیستم‌های امن و سریع |
| Typst | ۲۰۲۳ | حروف‌چینی |

{width=auto}
| auto | width |
|------|-------|
| as wide | as content |

{width=auto align=left}
| aligned | left |
|---------|------|
| 1 | 2 |

{caption="زبان‌ها و سبک‌شان" #tbl-langs}
| زبان | سبک | تایپ |
|------|-----|------|
| Haskell | تابعی | ایستا |
| JavaScript | چندالگویی | پویا |

{#tbl-en caption="Feels at a glance"}
| Feel | Corners | Fonts |
|------|---------|-------|
| formal | square | New Computer Modern + XB Niloofar |
| standard | slightly rounded | Inter + IRANSans |
| friendly | very rounded | Lexend + Pelak |

جدول‌ها در <ref to="tbl-langs"></ref> و <ref to="tbl-en"></ref> شماره خورده‌اند.

```md
{width=full}
| this | stays code |
```

---

## &rlm;Alert و Box

<alert type="note">

**note:** یادداشت با آیکون و رنگ بنفش.

</alert>

<alert type="info">

**info:** اطلاعات.

</alert>

<alert type="tip">

**tip:** نکته‌ای کاربردی.

</alert>

<alert type="success">

**success:** با موفقیت انجام شد.

</alert>

<alert type="warning">

## تیتر داخل alert

**warning:** مراقب باشید.

</alert>

<alert type="danger">

**danger:** این کار برگشت‌ناپذیر است.

</alert>

<alert type="important">

**important:** حتماً بخوانید.

</alert>

<alert>

alert بدون نوع: خاکستری خنثی و بدون آیکون.

</alert>

<alert color="teal" icon="rocket" radius="2">

An English alert with a preset color, a custom icon and a custom radius.

</alert>

<alert color="#ffe6f4" icon="heart">

alert با رنگ hex دلخواه.

</alert>

پریست‌های رنگی `<box>`:

<grid cols="4" gap-x="8pt" gap-y="8pt">
<item><box color="purple">

purple

</box></item>
<item><box color="blue">

blue

</box></item>
<item><box color="teal">

teal

</box></item>
<item><box color="green">

green

</box></item>
<item><box color="yellow">

yellow

</box></item>
<item><box color="red">

red

</box></item>
<item><box color="pink">

pink

</box></item>
<item><box color="#e0efff" border="1" border-color="blue" radius="0" padding="8pt">

hex + preset border

</box></item>
</grid>

---

## شکل‌ها و چیدمان

<fig id="fig-ocean" height="3cm" ratio="16/9">
<img src="images/ocean.svg" alt="اقیانوس" radius="6">
<caption>نمای ساده‌ای از اقیانوس (برش ۱۶:۹).</caption>
</fig>

<fig id="fig-gqa" width="85%">
<img src="images/gqa.svg" alt="GQA">
<caption>Grouped-query attention: each key/value head is shared by four query heads.</caption>
</fig>


چیدمان ستونی با `<grid>`؛ مورد اول دو ستون می‌گیرد:

<grid cols="3" gap-x="12pt">
<item span="2">

<fig align="center" height="2.5cm">
<img src="images/ocean.svg" alt="ocean" radius="8">
<caption>شکل داخل grid.</caption>
</fig>

</item>
<item>

<box color="blue" padding="10pt">

متن کنار شکل، داخل یک box آبی.

</box>

</item>
</grid>

<grid cols="2" dir="ltr">
<item>

**Left column** in an LTR grid.

</item>
<item>

**Right column.**

</item>
</grid>

جعبه‌های داخل آیتم‌ها به‌طور پیش‌فرض خانه را پر می‌کنند و هم‌قد می‌شوند؛ با `width="auto" height="auto"` اندازهٔ طبیعی‌شان می‌ماند و با `halign` و `valign` در خانه جا می‌گیرند:

<grid cols="3" gap-x="12pt">
<item>

<box color="green">

پیش‌فرض: هم‌عرض و هم‌قد خانه.

</box>

</item>
<item width="auto" height="auto" halign="center" valign="center">

<box color="teal">

وسط خانه

</box>

</item>
<item>

<alert type="tip">

این هشدار کمی بلندتر است و قد ردیف را تعیین می‌کند؛ دو جعبهٔ دیگر کنارش تراز می‌شوند.

</alert>

</item>
</grid>

### تراز با &rlm;align

<align>

این پاراگراف با `<align>` بدون ویژگی وسط‌چین شده است.

| وسط | جدول |
|-----|------|
| از align | ارث می‌برد |

{width=auto}
| auto | table |
|------|-------|
| centered | too |

</align>

<align to="left">

این پاراگراف فارسی با `to="left"` چپ‌چین شده است.

```py
print("code stays left")
```

</align>

<align right>

Bare attribute: this English paragraph is right-aligned.

</align>

<align to="end">

متن فارسی با `end` به چپ می‌رود.

An English paragraph with `end` goes to the right.

</align>

### مراحل با &rlm;steps

<steps>
<step title="جمع‌آوری داده">

داده‌ها از سه منبع جمع می‌شوند و در یک پوشه کنار هم قرار می‌گیرند. این توضیح عمداً کمی بلند است تا ببینیم خط اتصال تا مرحلهٔ بعد ادامه پیدا می‌کند.

</step>
<step title="پاک‌سازی">

حذف رکوردهای تکراری.

</step>
<step title="آموزش مدل">

```py
model.fit(x, y)
```

</step>
</steps>

<steps color="teal" start="4">
<step title="Evaluate">

Measure accuracy on the held-out set.

</step>
<step>

A step without a title: its first line is centered on the marker.

</step>
</steps>

---

## رسم با CeTZ

شمارش زیگزاگی در <ref to="fig-zigzag"></ref> آمده است.

<fig id="fig-zigzag" height="4.5cm">
<cetz>

```typ
let pos(n, m) = (m * 1.7, -n * 1.1)
let name(n, m) = "a" + str(n) + "-" + str(m)
for n in range(1, 5) {
  content((0.4, -n * 1.1), text(fill: theme.muted, size: 0.85em)[$A_#n$])
  for m in range(1, 5) {
    content(pos(n, m), $a_(#n, #m)$, name: name(n, m))
  }
}
let order = ((1, 1), (1, 2), (2, 1), (3, 1), (2, 2), (1, 3), (1, 4), (2, 3), (3, 2), (4, 1))
for i in range(order.len() - 1) {
  let a = name(..order.at(i))
  let b = name(..order.at(i + 1))
  line((a, 22%, b), (a, 78%, b), stroke: 0.8pt + theme.accent, mark: (end: ">", fill: theme.accent))
}
for (i, (n, m)) in order.enumerate() {
  circle((rel: (0.42, 0.28), to: pos(n, m)), radius: 0.17, fill: theme.accent, stroke: none)
  content((rel: (0.42, 0.28), to: pos(n, m)), text(fill: theme.bg, size: 0.6em, weight: "bold", str(i + 1)))
}
```

</cetz>
<caption>شمارش زیگزاگی اعضای بازه‌ها: عدد روی هر عضو، نوبت آن در شمارش است.</caption>
</fig>

برچسب‌های فارسی، انگلیسی و ترکیبی هر کدام جهت خودشان را می‌گیرند (<ref to="fig-labels"></ref>):

<fig id="fig-labels" width="80%">
<cetz>

```
let w = 4.5
let tip = (end: ">", fill: theme.fg)
let node(y, name, label, tint) = {
  rect((-w / 2, y - 0.38), (w / 2, y + 0.38), radius: 0.25, name: name,
    fill: tint.transparentize(82%), stroke: 0.6pt + tint)
  content(name, label)
}
node(0, "a", [درخواست ورودی], theme.accent)
node(-1.2, "b", [RMSNorm (`attn_norm`)], theme.muted)
node(-2.4, "c", [`default_server` یا اولین بلوک], theme.heading)
line("a.south", "b.north", mark: tip)
line("b.south", "c.north", mark: tip)
```

</cetz>
<caption>برچسب فارسی، برچسب انگلیسی با کد، و برچسب ترکیبی.</caption>
</fig>

رسم تنها، خارج از `<fig>`:

<cetz unit="0.8cm">

```typ
circle((0, 0), radius: 1, fill: theme.accent.transparentize(80%))
line((-1.4, 0), (1.4, 0), mark: (end: ">"))
line((0, -1.4), (0, 1.4), mark: (end: ">"))
line((0, 0), (calc.cos(40deg), calc.sin(40deg)), stroke: theme.accent + 1pt)
content((1.6, 0), $x$)
content((0, 1.65), $y$)
content((0.75, 0.25), text(size: 0.8em)[$theta$])
```

</cetz>

---

## درخت فایل‌ها و نمودار {#tree-chart}

ساختار پوشه‌ها با `<tree>`: هر خط یک فایل یا پوشه، تورفتگی یعنی «داخل خط بالا» و بعد از ` # ` توضیح:

<tree caption="ساختار پروژهٔ قالب" id="fig-tree">

```
formatex/
  main.typ          # نقطهٔ ورود و کامپوننت‌ها
  template.typ      # تنظیم صفحه، تم و جهت متن
  config.toml
  docs/
    doc_en.md
    doc_fa.md       # راهنمای فارسی
  images/
    ocean.svg
    logo.png
  examples/
    sample.py
    data.csv
  .gitignore
  references.bib
```

</tree>

خروجی دستور `tree` هم مستقیم پذیرفته می‌شود (این‌جا بدون آیکون):

<tree icons="false">

```
src
├── app
│   ├── page.tsx
│   └── layout.tsx
├── lib
│   └── db.ts
└── package.json
```

</tree>

نمودار میله‌ای از یک جدول Markdown؛ ستون اول برچسب‌ها و هر ستون دیگر یک سری است:

<chart caption="تعداد دانشجویان ورودی" id="fig-chart-bar" y-title="نفر" values="true">

| رشته | ۱۴۰۲ | ۱۴۰۳ | ۱۴۰۴ |
|------|------|------|------|
| کامپیوتر | ۱۲۰ | ۱۴۵ | ۱۶۰ |
| برق | ۹۰ | ۸۵ | ۹۵ |
| مکانیک | ۷۰ | ۷۵ | ۶۵ |
| عمران | ۵۰ | ۶۰ | ۵۵ |

</chart>

نمودار خطی با واحد و عنوان محورها:

<chart type="line" caption="دقت مدل در طول آموزش" x-title="دوره" y-title="دقت" unit="%" values="true">

| دوره | آموزش | اعتبارسنجی |
|------|-------|------------|
| ۱ | ۶۲ | ۶۰ |
| ۲ | ۷۴ | ۷۰ |
| ۳ | ۸۱ | ۷۶ |
| ۴ | ۸۶ | ۷۹ |
| ۵ | ۸۹ | ۸۰ |

</chart>

<grid cols="2">
<item>

<chart type="pie" caption="سهم مرورگرها">

| مرورگر | سهم |
|--------|-----|
| کروم | ۶۵ |
| سافاری | ۱۸ |
| فایرفاکس | ۷ |
| سایر | ۱۰ |

</chart>

</item>
<item>

<chart type="donut" caption="Time spent" values="true" unit="h" dir="ltr">

| Task | Hours |
|------|-------|
| Coding | 14 |
| Writing | 9 |
| Meetings | 4 |

</chart>

</item>
</grid>

ارجاع: <ref to="fig-tree"></ref> و <ref to="fig-chart-bar"></ref>.

---

## پیشرفت، مقایسه و پیش‌نویس {#progress-compare}

نوارهای پیشرفت از یک فهرست «برچسب: مقدار»:

<progress>

- طراحی: 100
- پیاده‌سازی: 70
- آزمون: 35
- مستندسازی: 10

</progress>

امتیاز ستاره‌ای و نقطه‌ای (با مقدار اعشاری):

<grid cols="2">
<item>

<progress style="stars">

- Typst: 4.5
- LaTeX: 3

</progress>

</item>
<item>

<progress style="dots" color="teal" values="false">

- Python: 5
- Rust: 2.5

</progress>

</item>
</grid>

<progress value="62" color="pink">Overall progress</progress>

<compare>

<pros>

- رایگان و متن‌باز
- کامپایل سریع
- پشتیبانی کامل از فارسی

</pros>

<cons title="محدودیت‌ها">

- بستهٔ کمتر از LaTeX
- نیاز به یادگیری زبان تازه

</cons>

</compare>

‏Draft notes: این جمله <todo>منبع اضافه شود</todo> هنوز ناقص است و <todo author="Ali">check the numbers</todo> باید بررسی شود.

<todo>

این بخش باید با نتایج آزمایش دوم به‌روز شود.

</todo>

<todo type="figure" height="90">نمودار مقایسهٔ زمان اجرا</todo>

<todos></todos>

---

## نامهٔ اداری {#letter}

<letter heading="بسمه تعالی" org="دانشگاه نمونه" number="۱۲۳/الف/۱۴۰۵" date="۱۴۰۵/۰۷/۱۸" attachment="ندارد" to="مدیر محترم گروه مهندسی کامپیوتر" from="دبیرخانهٔ پژوهشی" subject="درخواست تمدید مهلت پروژه" closing="با تشکر" signer="دکتر مریم احمدی" signer-title="معاون پژوهشی" cc="معاونت آموزشی؛ بایگانی">

احتراماً، به استحضار می‌رساند با توجه به تأخیر در تحویل تجهیزات آزمایشگاهی، خواهشمند است دستور فرمایید مهلت تحویل پروژهٔ کارشناسی دانشجو به مدت دو هفته تمدید شود.

</letter>

---

## تمرین‌ها {#exercises}

<exercise points="2" id="ex-limit">

حد زیر را محاسبه کنید: $\lim_{x \to 0} \frac{\sin x}{x}$

<answer>

با قاعدهٔ هوپیتال، حد برابر $1$ است.

</answer>

</exercise>

<exercise title="چندگزینه‌ای" points="1">

کدام زبان برای حروف‌چینی اسناد علمی ساخته شده است؟

<choices correct="3">

- Python
- JavaScript
- Typst
- SQL

</choices>

</exercise>

<exercise name="سؤال">

کدام گزینه دربارهٔ مرتب‌سازی سریع درست است؟

<choices correct="2" cols="1">

- همیشه در زمان $O(n)$ اجرا می‌شود.
- در حالت میانگین $O(n \log n)$ است.
- پایدار است.

</choices>

</exercise>

<exercise title="Proof" points="3">

Show that the sum of two even numbers is even.

<answer>

Let $a = 2m$ and $b = 2n$. Then $a + b = 2(m + n)$.

</answer>

</exercise>

ارجاع به <ref to="ex-limit"></ref>.

<answers></answers>

---

## تعریف‌ها و قضیه‌ها {#defs}

<definition id="def-limit" title="حد">

دنبالهٔ $a_n$ به $L$ همگراست اگر برای هر $\varepsilon > 0$ عددی مانند $N$ وجود داشته باشد که برای همهٔ $n > N$ داشته باشیم $|a_n - L| < \varepsilon$.

</definition>

<theorem id="thm-main" title="یکتایی حد">

حد یک دنبالهٔ همگرا یکتاست.

</theorem>

<proof>

فرض کنید $a_n \to L$ و $a_n \to M$. آنگاه $|L - M| \le |L - a_n| + |a_n - M|$ که به صفر میل می‌کند.

</proof>

<lemma id="lem-bounded">

هر دنبالهٔ همگرا کران‌دار است.

</lemma>

<corollary>

هر دنبالهٔ بی‌کران واگراست.

</corollary>

<example>

دنبالهٔ $a_n = 1/n$ به صفر همگراست.

</example>

<remark>

همگرایی به انتخاب نُرم بستگی دارد.

</remark>

## کلاس‌های Tailwind با `<div>` {#tailwind}

<div tailwind="p-4 bg-blue rounded-lg border border-blue text-lg font-bold">

یک کارت آبی با فاصلهٔ داخلی، حاشیه و گوشهٔ گرد (در همهٔ حالت‌ها، حتی `formal`).

</div>

<div tailwind="flex gap-3 my-3">

<div tailwind="p-3 bg-green rounded border border-green flex-1">

آیتم اول با `flex-1`.

</div>

<div tailwind="p-3 bg-red rounded border border-red flex-1">

آیتم دوم هم‌عرض اولی است و اگر متنش بلند شود در همان خانه می‌شکند.

</div>

<div tailwind="p-3 bg-yellow rounded w-24">Fixed width</div>

</div>

<div tailwind="flex items-center justify-between gap-4 p-3 border-b border-rule">

<div tailwind="font-bold">عنوان</div>

<div tailwind="text-sm text-muted">جزئیات در وسط</div>

<div tailwind="text-accent">Right end</div>

</div>

<div tailwind="flex flex-wrap gap-2 my-3">

<div tailwind="px-3 py-1 bg-purple rounded-full text-sm">tag one</div>
<div tailwind="px-3 py-1 bg-pink rounded-full text-sm">برچسب دوم</div>
<div tailwind="px-3 py-1 bg-teal rounded-full text-sm">tag three</div>

</div>

<div tailwind="flex items-center gap-3 p-3 border rounded-xl bg-blue/10">

<div tailwind="flex flex-col gap-1">

<div tailwind="font-bold">Card title</div>

<div tailwind="text-sm text-muted">A subtitle under the title</div>

</div>

<div tailwind="ms-auto px-2 bg-green rounded text-xs">New</div>

</div>

<div tailwind="flex flex-col h-32 gap-2 p-2 border justify-between my-3">

<div tailwind="p-1 bg-teal/30">top</div>

<div tailwind="p-1 bg-teal/30 grow">grows</div>

<div tailwind="p-1 bg-teal/30">bottom</div>

</div>

<div tailwind="mx-auto w-1/2 p-2 bg-secondary/20 text-center">centered half width</div>

## بلوک عنوان سلسله‌مراتبی {#docheader-tree}

<docheader color="teal" border="bt" fill="false">

<main>

<l-img src="images/ocean.svg" height="2.2cm" />

<r-img src="images/header-mountains.jpg" height="2.2cm" />

<title size="1">

عنوان *اصلی* سربرگ

</title>

<title size="2">

زیرعنوان متوسط

</title>

<title size="3">

Third line: small and gray

</title>

</main>

<info>

نویسنده — دانشگاه — ۱۴۰۵

یک پاراگراف دیگر با ریاضی $E = mc^2$.

</info>

</docheader>

<docheader border="tb" border-color="orange">

<title size="2">

فقط خط بالا و پایین

</title>

</docheader>

## نمودار داده با `<lilaq>` {#lilaq-demo}

<fig id="fig-lilaq">
<lilaq>

```typ
let xs = range(0, 17).map(i => i * 1000)
let ys = (1.45, 1.45, 0.37, 0.84, 0.92, 1.07, 1.27, 1.14, 1.15, 1.25, 1.4, 1.39, 1.37, 1.36, 1.38, 1.43, 1.45)
lq.diagram(
  title: strong[Syscall impact on user-mode IPC],
  xlabel: [Time (in cycles)], ylabel: [User-mode IPC],
  width: 11cm, height: 5cm,
  ylim: (0.3, 1.5), xlim: (0, 16000),
  xaxis: (exponent: none),
  lq.fill-between(xs, ys, y2: xs.map(_ => 1.45), fill: theme.accent.transparentize(45%)),
  lq.plot(xs, ys, color: theme.fg, stroke: 1.6pt, mark: lq.marks.s, mark-size: 3pt),
  lq.place(8800, 0.62, [Lost performance], align: left),
)
```

</lilaq>
<caption>افت کارایی پس از یک فراخوانی سیستمی (نمودار Lilaq).</caption>
</fig>

ارجاع به نمودار: <ref to="fig-lilaq"></ref>.

---

## درج فایل‌های دیگر {#includes}

فایل زیر با `<include>` وسط این سند آمده است؛ front matter آن نادیده گرفته می‌شود:

<include src="./included.md"></include>

```md
<include src="./included.md"></include>
```

ارجاع از فایل اصلی به محتوای فایل‌های درج‌شده: <ref to="included-heading"></ref>، <ref to="nested-heading"></ref>، <ref to="tbl-included"></ref> و <ref to="eq-nested"></ref>.

---

## ارجاع و منابع

ارجاع به بخش با id: <ref to="defs"></ref>؛ با متن تیتر: <ref to="جهت متن و قالب‌بندی"></ref>؛ به تیتری که با RLM شروع شده: <ref to="rlm-heading"></ref>.

ارجاع به شکل <ref to="fig-ocean"></ref>، جدول <ref to="tbl-langs"></ref>، تعریف <ref to="def-limit"></ref>، قضیه <ref to="thm-main"></ref> و لم <ref to="lem-bounded"></ref>. متن دلخواه برای پیوند: <ref to="thm-main">این قضیه</ref>. رابطه <ref to="eq-squares"></ref>، کد <ref to="code-fib"></ref> و مقایسه <ref to="diff-fact"></ref>.

علامت‌گذاری تکه متن در پاراگراف: با تگ span مثل <span id="span-ai">هوش مصنوعی</span> یا با نحو مارک‌داون مثل [شبکه‌های پیچیده]{#span-complex} در وسط متن. ارجاع به تکه متن: <ref to="span-ai"></ref> و <ref to="span-complex"></ref>.

تعریف‌های اینلاین و بلاک با تگ def:
ما از <def id="span-ai">شبیه‌سازی فرآیندهای هوش انسانی توسط سامانه‌های محاسباتی</def> در سامانه‌های نوین استفاده می‌کنیم. همچنین <def id="fig-ocean" color="teal">نمای امواج اقیانوس در غروب آفتاب</def> به شکل اشاره دارد.

<def id="span-complex" mode="block" color="purple">
شبکه‌ای متشکل از اجزا و پیوندهای متقابل غیرخطی که رفتار جمعی نوظهور پدید می‌آورد.
</def>

<def id="fig-ocean" mode="block" title="تصویر موج اقیانوس" color="blue">
این تصویر زیبایی طبیعی امواج اقیانوس و پراکندگی نور در افق را نشان می‌دهد.
</def>

ترنسفورمرها بر پایهٔ توجه‌اند <cite key="vaswani2017attention"></cite>. چند منبع با هم <cite key="ainslie2023gqa, lin2024awq"></cite>، با شمارهٔ صفحه <cite key="knuth1984texbook" page="ص. ۱۲"></cite>، یک منبع فارسی <cite key="mohammadi1399"></cite> و شکل Markdown [@cantor1874].

```bash
# this comment must stay as is {#not-a-heading}
echo hi
```

## English section {#en}

As shown in <ref to="fig-gqa"></ref> and <ref to="tbl-en"></ref>, and proved in <ref to="thm-main"></ref>, see <ref to="en"></ref>. <cite key="vaswani2017attention" form="prose"></cite> introduced the Transformer; GQA came later <cite key="ainslie2023gqa"></cite>.

<theorem id="thm-bw" title="Bolzano–Weierstrass">

Every bounded sequence in $\mathbb{R}$ has a convergent subsequence.

</theorem>

<proof>

By repeated bisection of the bounding interval.

</proof>

<alert type="info">

English alert: the icon sits on the left, and <ref to="thm-bw"></ref> is referenced in English.

Inline def in English: <def id="thm-bw" mode="inline" color="pink">A classic result in real analysis.</def>

<def id="thm-bw" mode="block" color="green">
Every bounded sequence of real numbers has a convergent subsequence.
</def>

</alert>

<bibliography></bibliography>

## لیست‌ها با گزینه‌ها {#lists-options}

یک خط `{...}` درست بالای لیست، فقط ظاهر همان لیست را عوض می‌کند. شماره با حروف ابجد و پرانتز بسته:

{numbers=abjad suffix=")"}
1. نخست
2. دوم
3. سوم

شماره‌های الفبایی با پیشوند و پسوند، و شروع از عدد دیگر:

{numbers=alefba prefix="(" suffix=")" start=3}
3. سومین مورد
4. چهارمین مورد

شمارهٔ رومی و شمارهٔ حرفی انگلیسی:

{numbers=rome suffix="."}
1. First
2. Second

{numbers=abc suffix=")"}
1. alpha
2. beta

شماره با کلمه (`fatxt`)، با عنوان و شناسه تا ارجاع داده شود (<ref to="lst-words"></ref>):

{numbers=fatxt caption="مراحل کار" #lst-words}
1. جمع‌آوری
2. پاک‌سازی
3. آموزش

نشانهٔ لیست بی‌شماره و خط‌های راهنمای سطح‌ها:

{marker=check}
- انجام شد
- در حال انجام
  - زیرمورد اول
  - زیرمورد دوم

{marker=arrow guides=tree}
- ریشه
  - شاخهٔ اول
    - برگ
  - شاخهٔ دوم

## خط، پاراگراف و اعداد {#hr-p-digit}

خط‌ها با سبک و رنگ دلخواه:

<hr />

<hr style="dashed" color="red" />

<hr style="double" width="50%" color="#1d4ed8" thickness="1.5pt" />

<hr style="wavy" color="teal" />

پاراگراف با تنظیمات خودش (`<p>`):

<p size="14pt" align="center" weight="bold" color="accent">

یک خط وسط‌چین، درشت‌تر و پررنگ به رنگ تأکید.

</p>

<p line-spacing="170" indent="1.5em" justify="true">

پاراگرافی با خط‌های باز و تورفتگی در خط اول. آن‌قدر ادامه دارد که چند خط شود و فاصله‌گذاری دیده شود؛ همین‌جا ببینید که تورفتگی فقط به خط اول می‌رسد و بقیهٔ خط‌ها تراز می‌مانند.

</p>

ارقام یک متن را به یک نوع تبدیل کنید (`<digit>`): <digit type="fa">اتاق 12، ۳۴ و ٥٦ — و 1405.</digit> و <digit type="ar">اتاق 12 و ۳۴</digit>.

شمارنده‌ها (`<counter>`): <counter of="ex" label="تمرین %1." /> معادله را حل کنید. <counter of="ex" label="تمرین %1." /> آن را ثابت کنید. و بخش <counter of="sec" /> بعد <counter of="sec" /> بعد <counter of="sec" format="rome" />.

لنگر درون‌خطی با هایلایت: <anchor id="anc-demo" highlight="true">این متن لنگر است</anchor> و ارجاعش <ref to="anc-demo"></ref>؛ پاورقی با تگ <footnote>یک پاورقی دیگر با نام footnote.</footnote>.

مقایسه با نام‌های `<old>` و `<new>`:

<diff mode="unified">
<old>

```js
const a = 1;
```

</old>
<new>

```js
const a = 2;
```

</new>
</diff>

## گفتگوی هوش مصنوعی {#chat-demo}

<chat title="مرور ادبیات">

<user>

برای مرور ادبیات پایان‌نامه‌ام از کجا شروع کنم؟

</user>

<ai>

سه قدم اول:

1. **کلیدواژه‌ها** را از سؤال پژوهش دربیاورید.
2. در گوگل اسکالر جستجو کنید و مقاله‌های پراستناد را جدا کنید.
3. منابع آن‌ها را از زوترو به شکل فایل `.bib` بگیرید.

</ai>

</chat>

## کد Typst داخل سند {#typ-demo}

<typ>

```typ
== بخشی که با Typst نوشته شده

رنگ تأکید #text(fill: theme.accent)[این رنگ] است.
```

</typ>

<pagebreak />

## picHeader

<picHeader src="images/header-mountains.jpg" title="عنوان بزرگ" subtitle="زیرعنوان اختیاری" height="50mm" />

متن بعد از تصویر.


<picHeader src="images/header-mountains.jpg" title="Full bleed" margin-x="false" height="45mm" />

<picHeader src="images/header-mountains.jpg" title="تاپ تاپی" subtitle="اینطوریه که یک عکس فول سرتاسری داریم اختیاری" break="before" margin-x="true" margin-y="false" height="60mm" />


خب ببین متن داخب def اینلاین وسط نیست یکمی پایینه
یک کامپوننت دیگه ازت میخوام اضافه کنی 
اینطوریه که یک عکس فول سرتاسری داریم
گرادایان مشکی به شفاف از پایین روی عکسه و یک تایتل سفید بزرگ و یک زیرتایتل اختیاری داره
پراپ ها:
مسیر عکس
تایتل
زیرتایتل اختیاری
اندازه ارتفاع
break: اگر خاموش باشد در همان محل درج می شود اگر before باشد می رود اول صفحه بعد
margin-x: اگر روشن باشد کل فضای عرض را میگیرد ولی حاشیه های سند را نمیگیرد. اگر خاموش باشد حتی حاشیه سند را هم میگیرد و در این حالت گردی گوشه ها حذف می شوند
margin-y: در حالتی که break=false هست هیچ اثری ندارد که چی است ولی وقتی break=true باشد اگر این مارجین روشن باشد می اید بالای صفحه ولی حاشیه بالا صفحه را از بین نمیبرد اما اگر خاموش باشد میرود می چسبد بالای صفحه و گردی احتمالی بالای آن حذف می شود.


<picHeader src="images/header-mountains.jpg" title="تاپ تاپی" subtitle="زیرعنوان اختیاری" break="before" margin-x="false" margin-y="false" height="60mm" />

متن بعد.
