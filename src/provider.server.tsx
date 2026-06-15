import type { Vocab } from "./state.types"
import type { PropsWithChildren } from "react";
import { StateVocabServerContext } from "./context.server";

export const StateVocabServerProvider: React.FC<PropsWithChildren<{
  value: Vocab
  serverContextKey: symbol
}>> = (props) => {
  const { serverContextKey, value, children } = props

  return (
    <StateVocabServerContext.Provider
      serverContextKey={serverContextKey}
      value={value}
    >
      {children}
    </StateVocabServerContext.Provider>
  )
};
