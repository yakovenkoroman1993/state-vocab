import { StateVocabServerProvider } from "./provider.server";
import { StateVocabClientProvider } from "./provider.client";
import type { Context, PropsWithChildren } from "react"
import type { Vocab } from "./state.types"
import VocabStore from "./store";

export function StateVocabProvider(
  props: PropsWithChildren<{
    value?: Vocab
    serverContextKey: symbol,
    clientContext: Context<VocabStore>,
  }>
) {
  const {
    children,
    serverContextKey,
    clientContext,
    value = {}
  } = props

  return (
    <StateVocabServerProvider
      serverContextKey={serverContextKey}
      value={value}
    >
      <StateVocabClientProvider
        clientContext={clientContext}
        value={value}
      >
        {children}
      </StateVocabClientProvider>
    </StateVocabServerProvider>
  )
}