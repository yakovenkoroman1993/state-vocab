"use client"

import { type Context, type PropsWithChildren, useState } from "react";
import VocabStore from "./store";
import type { Vocab } from "./state.types";
import { DefaultStateVocabClientContext } from "./context.client";

export function StateVocabClientProvider(
  props: PropsWithChildren<{
    clientContext?: Context<VocabStore>
    value?: Vocab
  }>
) {
  const { clientContext, value: vocab, children } = props

  const [store] = useState(() => {
    return new VocabStore(vocab)
  })

  const StateVocabClientContext = clientContext ?? DefaultStateVocabClientContext

  return (
    <StateVocabClientContext.Provider value={store}>
      {children}
    </StateVocabClientContext.Provider>
  ) 
}