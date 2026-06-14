import type { Vocab } from "./state.types"
import type { PropsWithChildren } from "react";
import { StateVocabServerContext } from "./context.server";

export const StateVocabServerProvider: React.FC<PropsWithChildren<{
  value: Vocab
}>> = ({ value, children }) => (
  <StateVocabServerContext.Provider value={value}>
    {children}
  </StateVocabServerContext.Provider>
);