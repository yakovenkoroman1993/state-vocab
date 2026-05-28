import { createContext, type PropsWithChildren, useContext, useMemo } from "react";
import VocabStore from "./store";

const VocabStoreContext = createContext({} as VocabStore)

export function useVocabStoreContext() {
  return useContext<VocabStore>(VocabStoreContext)
}

export function VocabStoreContextProvider({ children }: PropsWithChildren) {
  const store = useMemo(() => {
    return new VocabStore()
  }, [])
  
  return (
    <VocabStoreContext.Provider value={store}>
      {children}
    </VocabStoreContext.Provider>
  )
}