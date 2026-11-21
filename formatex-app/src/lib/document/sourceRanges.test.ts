import { expect, it } from "vitest"
import { sourceAtText, textAtSource, nodeAt, sourceIndex, type SourceRange } from "@formatex/core/source"

it("maps literal Unicode, generated expressions and decoded entities without guessing text", () => {
  const literal:SourceRange={file:"part.md",start:0,end:11,utf16Start:10,utf16End:17,textStart:0,textEnd:7,generated:false}
  const generated:SourceRange={file:"main.md",start:90,end:102,utf16Start:60,utf16End:72,textStart:7,textEnd:9,generated:true}
  const text="سلام 😀42"
  expect(sourceAtText([literal,generated],text,6)).toMatchObject({offset:16,end:16,range:{file:"part.md"}})
  expect(sourceAtText([literal,generated],text,7)).toMatchObject({offset:60,end:72,range:{file:"main.md"}})
  expect(textAtSource(generated,text,65)).toBe(7)
  const entity:SourceRange={file:"part.md",start:20,end:25,utf16Start:20,utf16End:25,textStart:0,textEnd:1,generated:false}
  expect(sourceAtText([entity],"&",0)).toMatchObject({offset:20,end:25})
  expect(textAtSource(entity,"&",23)).toBe(0)
})

it("uses half-open boundaries to choose the next leaf over its adjacent sibling", () => {
  const at={file:"main.md",line:1,column:1}
  const range=(start:number,end:number):SourceRange=>({file:"main.md",start,end,utf16Start:start,utf16End:end,generated:false})
  const index=sourceIndex({version:1,file:"main.md",settings:{},tokens:{},children:[{key:"first",type:"text",at,source:[range(0,3)]},{key:"second",type:"text",at,source:[range(3,8)]}]})
  expect(nodeAt(index,"main.md",3)?.node).toBe("second")
})
