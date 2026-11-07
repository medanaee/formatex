import { FORMATEX_DIR } from "@/lib/projects/paths"
import { systemImage } from "./systemClipboard"

/** The image formats Typst reads, by the type the clipboard names them with. */
const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
}

/** The folder a pasted image goes in: `images/` in a project the app keeps, `.formatex/images/` in a folder of the user's. */
export const imageFolder = (inFolder: boolean): string => (inFolder ? `${FORMATEX_DIR}/images` : "images")

/** `image_<n>.<ext>`: the next number after the highest one already in the folder, so a deleted number is not used again by mistake. */
export function nextImageName(existing: Iterable<string>, ext: string): string {
  let highest = 0
  for (const name of existing) {
    const found = /^image_(\d+)\./.exec(name.slice(name.lastIndexOf("/") + 1))
    if (found) highest = Math.max(highest, Number(found[1]))
  }
  return `image_${highest + 1}.${ext}`
}

/** The tag written where an image was pasted. */
export const figTag = (path: string): string => `<fig>\n<img src="${path}">\n</fig>`

/** An image on the clipboard of a paste event, if there is one (a copied file, a screenshot, or an image copied from a page). */
export function imageOfPaste(data: DataTransfer | null): File | null {
  if (!data) return null
  for (const item of data.items) if (item.kind === "file" && item.type.startsWith("image/")) return item.getAsFile()
  return [...data.files].find((file) => file.type.startsWith("image/")) ?? null
}

/** An image on the system clipboard, read without a paste event (the Paste menu items); `null` when there is none or reading is not allowed. */
export async function imageOnClipboard(): Promise<Blob | null> {
  // The desktop app reads it natively (the browser may not allow it)
  const native = await systemImage()
  if (native) return native
  try {
    for (const item of await navigator.clipboard.read()) {
      const type = item.types.find((candidate) => candidate.startsWith("image/"))
      if (type) return await item.getType(type)
    }
  } catch {
    // No permission, or nothing the browser lets us read
  }
  return null
}

/**
 * The bytes and the extension of an image Typst can read: png, jpeg, gif, webp and svg are kept as they are, any other format the
 * browser can show (a bitmap, a tiff) is redrawn as a png. `null` when it cannot be read as an image.
 */
export async function readableImage(blob: Blob): Promise<{ data: Uint8Array; ext: string } | null> {
  const ext = EXTENSIONS[blob.type]
  if (ext) return { data: new Uint8Array(await blob.arrayBuffer()), ext }
  try {
    const bitmap = await createImageBitmap(blob)
    const canvas = document.createElement("canvas")
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0)
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
    return png ? { data: new Uint8Array(await png.arrayBuffer()), ext: "png" } : null
  } catch {
    return null
  }
}
