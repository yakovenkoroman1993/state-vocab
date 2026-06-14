import { StateVocabServerProvider } from "./provider.server";
import { StateVocabClientProvider } from "./provider.client";
import type { PropsWithChildren } from "react"
import type { Vocab } from "./state.types"

export function StateVocabProvider(
  props: PropsWithChildren<{
    value?: Vocab
  }>
) {
  const { children, value = {} } = props

  return (
    <StateVocabServerProvider value={value}>
      <StateVocabClientProvider value={value}>
        {children}
      </StateVocabClientProvider>
    </StateVocabServerProvider>
  )
}