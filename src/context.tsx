import { createContext, type PropsWithChildren, useContext, useMemo } from "react";
import VocabStore from "./store";

const VocabStoreContext = createContext({} as VocabStore)

export function useVocabStoreContext(
  options: {
    verbose?: boolean
  } = {}
) {
  const context = useContext<VocabStore>(VocabStoreContext)

  if (options.verbose) {
    console.log(`[${useVocabStoreContext.name}]: `, context.uid)
  }
  
  return context
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