import { useSyncExternalStore } from "react"
import { BREAKPOINTS, formFactorFor, type FormFactor } from "@/lib/formFactor"

const queries = [`(min-width: ${BREAKPOINTS.tablet}px)`, `(min-width: ${BREAKPOINTS.desktop}px)`]

function subscribe(onChange: () => void): () => void {
  const lists = queries.map((query) => window.matchMedia(query))
  lists.forEach((list) => list.addEventListener("change", onChange))
  return () => lists.forEach((list) => list.removeEventListener("change", onChange))
}

const read = (): FormFactor => formFactorFor(window.innerWidth)

/** The current screen class; re-renders only when it changes (not on every resize pixel). */
export function useFormFactor(): FormFactor {
  return useSyncExternalStore(subscribe, read, () => "desktop")
}
