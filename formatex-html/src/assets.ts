import type { Node } from "@formatex/core"

export type AssetRequest = { kind: "graphic"; node: Node; key: string; bodyOnly: boolean; inline: boolean } | { kind: "asset"; path: string; text: boolean }

/** Serializable service requests let hosts supply native/remote services without app imports. */
export class MissingAssetsError extends Error {
  requests: AssetRequest[]
  constructor(requests: AssetRequest[]) {
    super("Document assets are required")
    this.name = "MissingAssetsError"
    this.requests = requests
  }
}
