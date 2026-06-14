"use client"

import { type PropsWithChildren, useState } from "react";
import VocabStore from "./store";
import type { Vocab } from "./state.types";
import { StateVocabClientContext } from "./context.client";


export function StateVocabClientProvider(
  props: PropsWithChildren<{ value?: Vocab }>
) {
  const { children, value: vocab } = props

  const [store] = useState(() => new VocabStore(vocab))

  return (
    <StateVocabClientContext.Provider value={store}>
      {children}
    </StateVocabClientContext.Provider>
  ) 
}