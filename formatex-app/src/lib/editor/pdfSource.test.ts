import { expect, it } from "vitest"
import { pdfPlaceAt, pdfSourceAt, sourceOffset } from "./pdfSource"
import type { PageMap } from "@/lib/compiler"

it("uses exact provenance for duplicate words, distinct columns and included files", () => {
  const box = (x:number,y:number,file:string,start:number) => ({x,y,w:30,h:10,node:`${file}:${start}`,source:[{file,utf16Start:start,utf16End:start+6,generated:false}]})
  const map:PageMap={width:500,height:700,texts:[],links:[],sources:[box(10,20,"main.md",10),box(200,20,"part.md",10),box(10,60,"main.md",30)]}
  expect(pdfSourceAt(map,210,25)).toMatchObject({file:"part.md",utf16Start:10})
  expect(pdfSourceAt(map,15,65)).toMatchObject({file:"main.md",utf16Start:30})
  expect(pdfSourceAt(map,100,200)).toBeNull()
  expect(pdfPlaceAt([map],"main.md",32)).toMatchObject({page:0,y:60,approximate:false})
  expect(pdfPlaceAt([map],"part.md",12)).toMatchObject({y:20})
  expect(pdfPlaceAt([map],"main.md",16)).toBeNull()
  expect(sourceOffset("سلام 😀\nrepeat",2,3)).toBe(10)
})
