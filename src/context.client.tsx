"use client"

import { type Context, createContext, useContext } from "react";
import VocabStore from "./store";

export const DefaultStateVocabClientContext = createContext({} as VocabStore)

/**
 * @see method from from https://zustand.docs.pmnd.rs/learn/guides/nextjs
 */
export function useStateVocabClientContext(
  options: {
    clientContext: Context<VocabStore> | undefined
    verbose: boolean
  }
) {
  const vocabStore = useContext(options.clientContext ?? DefaultStateVocabClientContext)

  if (options.verbose) {
    console.log(`[Store uid]: ${vocabStore.uid}`)
  }
  
  return vocabStore
}
