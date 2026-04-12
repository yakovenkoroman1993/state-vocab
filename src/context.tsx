import {
  type SetStateAction,
  type PropsWithChildren,
  type Dispatch,
  createContext,
  useContext,
  useState,
} from "react";

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

export const StateVocabContextProvider = ({ children }: PropsWithChildren) => {
  const [stateVocab, setStateVocab] = useState<Vocab>({})
  console.log(stateVocab)

  return (
    <StateVocabContext.Provider value={{ stateVocab, setStateVocab }}>
      {children}
    </StateVocabContext.Provider>
  )
}