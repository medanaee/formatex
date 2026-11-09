---
dir: auto
chat:
  ai-name: "دستیار پژوهشی"
---

<docheader title="نمونهٔ کامپوننت چت" subtitle="گفتگو با دستیار هوش مصنوعی در سه ظاهر"></docheader>

## گفتگوی پیش‌فرض

ظاهر این گفتگو از `feel` پروژه می‌آید: `formal` به شکل متن گفتگو، `standard` شبیه ChatGPT و `friendly` حباب‌های پیام‌رسان.

<chat  title="مرور ادبیات">

<user>

برای مرور ادبیات پایان‌نامه‌ام از کجا شروع کنم؟

</user>

<ai>

سه قدم اول:

1. **کلیدواژه‌ها** را از عنوان و سؤال پژوهش دربیاورید.
2. در **Google Scholar** و **Scopus** جستجو کنید و مقاله‌های پراستناد را جدا کنید.
3. از فهرست منابع همان مقاله‌ها، مقاله‌های پایه را پیدا کنید (جستجوی گلوله‌برفی).

</ai>

<user>

برای مدیریت منابع چه ابزاری پیشنهاد می‌کنی؟

</user>

<ai>

ابزار **Zotero** رایگان است و خروجی BibTeX می‌دهد؛ همان فایلی که این قالب در `<bibliography>` می‌خواند:

```bibtex
@article{vaswani2017,
  title  = {Attention Is All You Need},
  author = {Vaswani, Ashish and others},
  year   = {2017}
}
```

</ai>

</chat>

## همان گفتگو در دو ظاهر دیگر

<chat style="bubbles" user-name="مهدی" ai-color="teal">

<user>

این جمله را رسمی‌تر کن: «نتایج نشون می‌ده روش ما بهتره.»

</user>

<ai>

«نتایج نشان می‌دهد که روش پیشنهادی عملکرد بهتری دارد.»

</ai>

</chat>

<chat style="transcript" frame="false">

<user>

فرق دقت (precision) و بازیابی (recall) چیست؟

</user>

<ai>

دقت می‌گوید از پیش‌بینی‌های مثبت چندتا درست بوده؛ بازیابی می‌گوید از نمونه‌های مثبت واقعی چندتا پیدا شده:

$$
\text{Precision} = \frac{TP}{TP + FP}, \qquad \text{Recall} = \frac{TP}{TP + FN}
$$

</ai>

</chat>

## English chat

<chat style="bubbles" ai-name="Assistant" ai-icon="wand-magic-sparkles">

<user>

How do I sort a list of tuples by the second item in Python?

</user>

<ai>

Use `sorted` with a `key`:

```python
pairs = [("a", 3), ("b", 1), ("c", 2)]
print(sorted(pairs, key=lambda p: p[1]))
```

</ai>

</chat>
