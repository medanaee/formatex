<lilaq>
```typ
let xs = range(0, 9)
lq.diagram(
  width: 8cm, height: 3.6cm,
  lq.plot(xs, xs.map(x => calc.sin(x / 1.6)), color: theme.accent, stroke: 1.6pt),
)
```
</lilaq>
