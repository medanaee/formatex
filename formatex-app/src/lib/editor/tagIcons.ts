import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import {
  Anchor,
  AlignCenter,
  Asterisk,
  BookOpen,
  Blocks,
  Captions,
  ChartColumn,
  ChartLine,
  ClipboardList,
  Code,
  Columns2,
  CornerDownRight,
  FileInput,
  FolderTree,
  GitCompare,
  Image,
  Keyboard,
  Languages,
  LayoutGrid,
  Library,
  Link,
  List,
  ListOrdered,
  ListTodo,
  ListTree,
  Mail,
  MessagesSquare,
  MoveVertical,
  PanelTop,
  PenTool,
  Quote,
  SeparatorHorizontal,
  Sigma,
  Smile,
  Settings2,
  Square,
  Tag,
  TriangleAlert,
  Type,
  type LucideIcon,
} from "lucide-react"

/** An icon for each of the engine's tags (and a few families of them); anything else, including a user's own tag, gets `Blocks`. */
const ICONS: Record<string, LucideIcon> = {
  alert: TriangleAlert,
  align: AlignCenter,
  badge: Tag,
  box: Square,
  cetz: PenTool,
  chart: ChartColumn,
  lilaq: ChartLine,
  chat: MessagesSquare,
  cite: Quote,
  bibliography: Library,
  code: Code,
  compare: Columns2,
  def: BookOpen,
  diff: GitCompare,
  dir: Languages,
  div: Square,
  docheader: PanelTop,
  picheader: PanelTop,
  exercise: ClipboardList,
  fig: Image,
  img: Image,
  caption: Captions,
  lof: List,
  lot: List,
  lol: List,
  grid: LayoutGrid,
  icon: Smile,
  kbd: Keyboard,
  letter: Mail,
  a: Link,
  span: Type,
  anchor: Anchor,
  progress: ChartColumn,
  ref: CornerDownRight,
  v: MoveVertical,
  pagebreak: SeparatorHorizontal,
  steps: ListOrdered,
  theorem: Sigma,
  lemma: Sigma,
  definition: Sigma,
  corollary: Sigma,
  example: Sigma,
  remark: Sigma,
  proof: Sigma,
  toc: ListTree,
  todo: ListTodo,
  todos: ListTodo,
  tree: FolderTree,
  fn: Asterisk,
  footnote: Asterisk,
  include: FileInput,
}

export const tagIcon = (name: string): LucideIcon => ICONS[name] ?? Blocks

const svgCache = new Map<string, string>()

/** The icon as an SVG string, for places that are not React (the editor's widgets). */
export function tagIconSvg(name: string, size = 14): string {
  const key = `${name}:${size}`
  let svg = svgCache.get(key)
  if (!svg) {
    svg = renderToStaticMarkup(createElement(tagIcon(name), { size, "aria-hidden": true }))
    svgCache.set(key, svg)
  }
  return svg
}

/** The settings gear used by the editor's widgets. */
export function gearSvg(size = 14): string {
  const key = `gear:${size}`
  let svg = svgCache.get(key)
  if (!svg) {
    svg = renderToStaticMarkup(createElement(Settings2, { size, "aria-hidden": true }))
    svgCache.set(key, svg)
  }
  return svg
}
