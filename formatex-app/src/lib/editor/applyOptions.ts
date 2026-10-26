import type { ConfigureRequest } from "./livePreview"
import { serializeOpenTag, serializeOptions, type Attrs } from "./tagSyntax"

export interface Edit {
  from: number
  to: number
  insert: string
}

/**
 * The text change that writes new attributes into the source, and the request as it stands afterwards (the popover stays open
 * while you keep changing fields, so its place in the text has to follow its own edits).
 *
 * - a tag: its opening tag is rewritten;
 * - a heading: the ` {...}` at the end of the line is rewritten, added or removed;
 * - a table or a list: the `{...}` line above it is rewritten, added (as a new line) or removed with its line break;
 * - a fenced code block without a <code> tag: the tag is wrapped around it on the first change.
 */
export function editFor(request: ConfigureRequest, attrs: Attrs, docLength: number): { edit: Edit | Edit[]; next: ConfigureRequest } {
  if (request.kind === "tag" && request.wrap) {
    // The tag is not in the text yet (a fenced code block that has no <code> around it): both its tags are written
    const { from, to } = request.wrap
    const open = serializeOpenTag({ name: request.name, attrs, selfClosing: false })
    return {
      edit: [
        { from, to: from, insert: `${open}
` },
        { from: to, to, insert: `
</${request.name}>` },
      ],
      next: { ...request, wrap: undefined, attrs, from, to: from + open.length },
    }
  }
  if (request.kind === "tag") {
    const insert = serializeOpenTag({ name: request.name, attrs, selfClosing: request.selfClosing })
    return { edit: { from: request.from, to: request.to, insert }, next: { ...request, attrs, to: request.from + insert.length } }
  }
  const options = serializeOptions(attrs)
  if (request.option === "heading") {
    const insert = options ? ` ${options}` : ""
    return {
      edit: { from: request.from, to: request.missing ? request.from : request.to, insert },
      next: { ...request, attrs, missing: !options, to: request.from + insert.length },
    }
  }
  // table
  if (request.missing) {
    return {
      edit: { from: request.from, to: request.from, insert: options ? `${options}\n` : "" },
      next: { ...request, attrs, missing: !options, to: request.from + options.length },
    }
  }
  if (!options) {
    return { edit: { from: request.from, to: Math.min(request.to + 1, docLength), insert: "" }, next: { ...request, attrs, missing: true, to: request.from } }
  }
  return { edit: { from: request.from, to: request.to, insert: options }, next: { ...request, attrs, to: request.from + options.length } }
}
