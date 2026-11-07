import { describe, expect, it } from "vitest"
import { figTag, imageFolder, nextImageName } from "./pastedImage"

describe("pasted images", () => {
  it("numbers the images one after the other", () => {
    expect(nextImageName([], "png")).toBe("image_1.png")
    expect(nextImageName(["images/image_1.png", "images/image_2.jpg"], "png")).toBe("image_3.png")
    // Other names do not count, and a gap is not filled
    expect(nextImageName(["images/photo.png", "images/image_5.png", "image_x.png"], "webp")).toBe("image_6.webp")
  })

  it("keeps the images where the engine's own files are in a folder project", () => {
    expect(imageFolder(false)).toBe("images")
    expect(imageFolder(true)).toBe(".formatex/images")
  })

  it("writes the picture in a fig tag", () => {
    expect(figTag("images/image_1.png")).toBe('<fig>\n<img src="images/image_1.png">\n</fig>')
  })
})
