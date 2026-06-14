"use client"

import { createContext, useContext } from "react";
import VocabStore from "./store";

export const StateVocabClientContext = createContext({} as VocabStore)

/**
 * @see method from from https://zustand.docs.pmnd.rs/learn/guides/nextjs
 */
export function useStateVocabClientContext(
  options: {
    verbose?: boolean
  } = {}
) {
  const context = useContext(StateVocabClientContext)

  if (options.verbose) {
    console.log(`[Store uid]: ${context.uid}`)
  }
  
  return context
}
