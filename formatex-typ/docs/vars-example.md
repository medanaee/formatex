---
cover:
  title: "{{ course }}: {{ exam.title }}"
  author: "Dr. Rezaei"
vars:
  course: "Calculus 1"
  year: 1405
  draft: true
  audience: teacher
  level: 2
  width: 12em
  exam: data/exam.json
var-types:
  audience: [student, teacher, parent]
  level: { min: 1, max: 3 }
  width: length
  exam: json
---

# {{ course }}, term {{ year }}

Reader: **{{ audience }}**, theme: {{ setting.theme }}, {{ if draft { "draft" } else { "final" } }}.

<alert type="{{ if draft { 'warning' } else { 'info' } }}" title="{{ course }}">
Level {{ level }}, and {{ calc.pow(2, level) }} is 2 to the level.
</alert>

## Who reads this

{{
  if audience == "teacher" [
    ### Answer key

    * Total marks: {{ exam.questions.map(q => q.score).sum() }}
    * Hard questions: {{ exam.questions.filter(q => q.level >= 3).len() }}
  ] else if audience == "parent" [
    ### For parents
  ] else [ Good luck! ]
}}

## Questions

{{
  for (i, q) in exam.questions.enumerate() {
    [{{ i + 1 }}. {{ q.text }} ({{ q.score }} marks, level {{ q.level }})]
    "
"
  }
}}

## Local variables

{{
  let w = width * 2
  let name = "Ali"
  [{{ name }} gets a box {{ repr(w) }} wide.]
}}

## Changing a variable

{{ level += 1 }}
The level is now {{ level }}.

Escaped: \{{ level }} and code `{{ level }}`.

<pagebreak />

## Page values

Page {{ PAGE }} of {{ PAGES }}, section "{{ SECTION }}".

{{ if PAGE == 1 [ **first page** ] else [ _not the first page_ ] }}
