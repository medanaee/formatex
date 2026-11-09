---
# This front matter must be ignored: only the main file's settings count.
theme: dracula
feel: friendly
header:
  style: double
  start: "THIS SHOULD NOT APPEAR"
---

### تیتر از فایل درج‌شده {#included-heading}

این بخش از فایل `examples/included.md` آمده است. تیترش در شماره‌گذاری و فهرست مطالب ادامهٔ فایل اصلی است، و می‌تواند به فایل اصلی ارجاع دهد: <ref to="direction"></ref>.

{caption="جدولی از فایل درج‌شده" #tbl-included}
| فایل | نقش |
|------|-----|
| `demo.md` | فایل اصلی |
| `examples/included.md` | درج‌شده |
| `examples/nested.md` | درج تودرتو |

<include src="examples/nested.md"></include>
