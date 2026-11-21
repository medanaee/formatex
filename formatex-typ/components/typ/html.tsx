import { renderBuiltin } from "formatex"

export default function Component({ node, context }) {
  return renderBuiltin(node, context)
}
