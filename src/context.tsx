import {
  type SetStateAction,
  type PropsWithChildren,
  type Dispatch,
  createContext,
  useContext,
  useState,
} from "react";
import { logStyled } from "./utils";

export type Vocab<T = unknown> = Record<string, T | null>

type Context<V extends Vocab = Vocab> = {
  stateVocab: V
  setStateVocab: Dispatch<SetStateAction<V>>
}

const StateVocabContext = createContext<Context>({
  stateVocab: {},
  setStateVocab: () => {}
})

export function useStateVocabContext<T>() {
  return useContext(StateVocabContext as React.Context<Context<Vocab<T>>>)
}

export const StateVocabContextProvider = (
  props: PropsWithChildren<{ verbose?: boolean }>
) => {
  const { children, verbose } = props

  const [stateVocab, setStateVocab] = useState<Vocab>({})

  if (verbose) {
    logStyled(stateVocab)
  }

  return (
    <StateVocabContext.Provider value={{ stateVocab, setStateVocab }}>
      {children}
    </StateVocabContext.Provider>
  )
}