---
title: "Files from the internet and from outside the project"
---

# Files from outside the project

Make a project anywhere that is NOT inside `D:\Uni\formatex\formatex-app\docs\examples\external-files\outside`, paste this
document into its main file, and open the project. If your system is not Windows, or the repository is somewhere else, change the
three `file:///D:/Uni/formatex/formatex-app/docs/examples/external-files/outside/...` addresses below to where `logo.svg` and
`data.json` are on your computer (`file:///home/me/...` on Linux and macOS).

The first compile downloads the internet files into the project's `.cache` and copies the local ones there; the next compiles do not
use the network. Try, in this order:

1. Compile once (it needs the network), then turn the network off and edit some text: the images and the numbers stay.
2. Change `data.json` (for example `"year": 1406`): the next compile shows the new value by itself.
3. Delete or rename `logo.svg`: the document still builds from the kept copy.
4. Open the arrow beside the sync button: every address is listed with a small picture, and each has its own sync button.

## 1. From the internet

An image in the usual Markdown way:

![A PNG from Wikimedia](https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png)

The same in a `<fig>`, with a caption and a size:

<fig>
<img src="https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png" width="60%" radius="8">
<caption>A figure whose picture comes from the internet</caption>
</fig>

Data from the internet inside a `{{ }}` code block:

{{
  let todo = json("https://jsonplaceholder.typicode.com/todos/1")
  [The first to-do is "{{ todo.title }}", and it is {{ if todo.completed [done] else [not done] }}.]
}}

## 2. From this computer, outside the project

An image:

![A local SVG](file:///D:/Uni/formatex/formatex-app/docs/examples/external-files/outside/logo.svg)

<img src="file:///D:/Uni/formatex/formatex-app/docs/examples/external-files/outside/logo.svg" width="3cm">

Data in a `{{ }}` code block:

{{
  let local = json("file:///D:/Uni/formatex/formatex-app/docs/examples/external-files/outside/data.json")
  [{{ local.title }}, {{ local.year }}, by {{ local.authors.join(" and ") }}.]
}}

## 3. Both in one block

{{
  let net = json("https://jsonplaceholder.typicode.com/todos/1")
  let local = json("file:///D:/Uni/formatex/formatex-app/docs/examples/external-files/outside/data.json")
  [{{ local.title }} ({{ local.year }}) and the to-do "{{ net.title }}".]
}}

## 4. What still does not work

Inside the `[ ... ]` of a code block the text is Markdown, so a value is written with its own `{{ }}`, not `#`. A path that starts with a single `/` is the root of the project, as in Typst, so `/images/a.png` is a file of the project, not of the
computer. A `.txt` file outside the project is refused (only pictures and data files are read from outside), and an address inside
`<typ>` blocks is not changed.
