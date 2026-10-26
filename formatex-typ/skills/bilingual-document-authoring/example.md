# Complete example

A short Persian research report: `config.toml`, `references.bib` and `report.md`. It uses components only where they add something: a title block, citations, cross-references, one definition and theorem, one figure, one code listing, one alert and one captioned table. Everything else is plain Markdown.

## config.toml

```toml
source = "report.md"
theme = "paper"
feel = "formal"
page = "a4"
margin = "normal"
scale = 100
columns = 1
column-dir = "rtl"

[paragraph]
justify = true

[heading]
numbering = true
number-suffix = "-"
underline = true
max-level = 1

[table]
width = "full"

[equation]
numbering = "labelled"
```

## references.bib

```bibtex
@inproceedings{vaswani2017attention,
  title     = {Attention Is All You Need},
  author    = {Vaswani, Ashish and Shazeer, Noam and Parmar, Niki and others},
  booktitle = {Advances in Neural Information Processing Systems},
  year      = {2017}
}

@inproceedings{ainslie2023gqa,
  title     = {{GQA}: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints},
  author    = {Ainslie, Joshua and Lee-Thorp, James and de Jong, Michiel and others},
  booktitle = {Proceedings of the 2023 Conference on Empirical Methods in Natural Language Processing},
  year      = {2023}
}
```

## report.md

````markdown
---
header:
  style: line
  start: "گزارش پژوهشی: توجه گروهی"
  end: "{section}"
footer:
  center: "صفحه {page} از {pages}"
bibliography:
  file: references.bib
  style: ieee
  title: "منابع"
---

<docheader title="کاهش هزینهٔ حافظه در مدل‌های زبانی با توجه گروهی" subtitle="نام نویسنده — دانشگاه نمونه"></docheader>

**چکیده.** در این گزارش سازوکار توجه گروهی معرفی و با توجه چندسر مقایسه می‌شود. نشان می‌دهیم که با اشتراک کلید و مقدار میان چند سر، حافظهٔ لازم برای حافظهٔ نهان تا چند برابر کم می‌شود.

<toc></toc>

## مقدمه {#sec-intro}

مدل‌های زبانی بزرگ بر پایهٔ سازوکار توجه ساخته شده‌اند <cite key="vaswani2017attention"></cite>. هزینهٔ اصلی استنتاج در این مدل‌ها نگه‌داری کلیدها و مقدارهای همهٔ توکن‌های قبلی است. روش توجه گروهی <cite key="ainslie2023gqa"></cite> این هزینه را کم می‌کند؛ جزئیات آن در <ref to="sec-method"></ref> آمده است.

&rlm;GQA در واقع حالتی میانی بین توجه چندسر و توجه تک‌کلیدی است.

## روش {#sec-method}

<definition id="def-gqa" title="توجه گروهی">

در توجه گروهی، $H$ سر پرسش به $G$ گروه تقسیم می‌شوند و همهٔ سرهای یک گروه یک کلید و یک مقدار مشترک دارند.

</definition>

خروجی هر سر با رابطهٔ زیر به دست می‌آید:

$$\mathrm{Attention}(Q, K, V) = \mathrm{softmax}\left(\frac{QK^\top}{\sqrt{d}}\right) V$$ {#eq-attn}

در رابطهٔ <ref to="eq-attn"></ref>، اندازهٔ $K$ و $V$ در توجه گروهی به جای $H$ با $G$ متناسب است. <ref to="fig-gqa"></ref> این ساختار را نشان می‌دهد.

<fig id="fig-gqa" width="80%">
<img src="images/gqa.svg" alt="توجه گروهی">
<caption>توجه گروهی: هر جفت کلید و مقدار میان چهار سر پرسش مشترک است.</caption>
</fig>

<theorem id="thm-memory" title="حافظهٔ نهان">

حافظهٔ نهان توجه گروهی $\frac{G}{H}$ برابر حافظهٔ توجه چندسر است.

</theorem>

<proof>

تعداد بردارهای کلید و مقدار ذخیره‌شده برای هر توکن از $H$ به $G$ کاهش می‌یابد و بقیهٔ عامل‌ها ثابت‌اند.

</proof>

## پیاده‌سازی

پیاده‌سازی ساده‌ای از تقسیم سرها در <ref to="code-gqa"></ref> آمده است.

<code caption="تکرار کلیدها برای هر گروه" id="code-gqa" highlight="3">

```python
def expand_kv(k, n_heads, n_groups):
    repeat = n_heads // n_groups
    return k.repeat_interleave(repeat, dim=1)
```

</code>

<alert type="tip">

تعداد سرها باید بر تعداد گروه‌ها بخش‌پذیر باشد.

</alert>

## نتایج {#sec-results}

{caption="مقایسهٔ حافظه و کیفیت" #tbl-results}
| روش | تعداد گروه | حافظهٔ نسبی | کیفیت |
|-----|:----------:|:-----------:|:-----:|
| توجه چندسر | ۳۲ | ۱٫۰ | ۱۰۰٪ |
| توجه گروهی | ۸ | ۰٫۲۵ | ۹۹٪ |
| تک‌کلیدی | ۱ | ۰٫۰۳ | ۹۶٪ |

طبق <ref to="tbl-results"></ref>، توجه گروهی با هشت گروه تقریباً همان کیفیت را با یک‌چهارم حافظه به دست می‌دهد؛ این با <ref to="thm-memory"></ref> سازگار است.

## نتیجه‌گیری

توجه گروهی راهی ساده برای کاهش حافظهٔ استنتاج است که تقریباً هیچ کیفیتی از دست نمی‌دهد.

<bibliography></bibliography>
````

Points to notice:
- The paragraph starting with the English word "GQA" begins with `&rlm;` so it stays right-to-left.
- Headings have no typed numbers; only the ones that are referenced have ids.
- Every tag that contains Markdown has blank lines inside it; `<fig>`, `<img>` and `<caption>` contain no Markdown paragraphs, so they need none.
- The document ends with `<bibliography></bibliography>` because it cites.

## Variations

**Thesis with a cover page** (add to the front matter; the TOC and lists get their own pages):

```yaml
cover:
  institution: "دانشگاه نمونه"
  faculty: "دانشکدهٔ مهندسی کامپیوتر"
  type: "پایان‌نامهٔ کارشناسی ارشد"
  title: "عنوان پایان‌نامه"
  author: "نام دانشجو"
  supervisor: "دکتر الف"
  advisor: "دکتر ب"
  date: "مهر ۱۴۰۵"
  frame: true
```

```markdown
<toc break="true"></toc>

<lof></lof>

<lot break="after"></lot>

## مقدمه
```

**Two-column paper:** add `columns: 2` to the front matter (with `column-dir = "rtl"` in `config.toml` for Persian), keep `<docheader>` at the top, and mark wide tables `{span=all caption="..." #tbl-x}`.

**English document:** write English text; directions follow automatically. Use `<toc dir="ltr"></toc>`, `column-dir: ltr` if it has two columns, `title: "References"` under `bibliography:`, and English captions (labels become "Figure 1", "Table 1", "Theorem 1", "Section 2").

```markdown
---
header:
  style: line
  start: "Group-Query Attention"
  end: "Page {page} of {pages}"
bibliography:
  title: "References"
---

<docheader title="Group-Query Attention" subtitle="A short report"></docheader>

<toc dir="ltr"></toc>

## Introduction {#sec-intro}

Attention is the core of modern language models <cite key="vaswani2017attention"></cite>. <ref to="sec-method"></ref> describes the method.

## Method {#sec-method}

...

<bibliography></bibliography>
```
