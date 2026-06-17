import type { Context } from "react";
import type { VocabThis } from "./state.types";
import type { ServerifyResult } from "./setup.server.types";
import { STATE_PATH } from "./constants";
import { getStateVocab, setStateVocab } from "./context.server";
import { StateVocabClientProvider } from "./provider.client";
import { get } from "./utils";
import VocabStore from "./store";
import { healtcheck, isServerSlot } from "./setup.server.utils";

function getState<V>(
  this: VocabThis,
  options: {
    serverContextKey: symbol
  }
): V {
  const statePath = this[STATE_PATH];

  const errorPrefix = `Failed access to "${statePath}".`
  healtcheck(errorPrefix)

  const vocab = getStateVocab(options.serverContextKey)
  if (!vocab) {
    throw new Error(
      `${errorPrefix} Reason: no data. Make sure your component is wrapped in StateVocabProvider.`
    )
  }

  return get(vocab, statePath) as V
}

function serverifyInner<R extends object>(
  tree: R,
  options: {
    serverContextKey: symbol
    wrap: (x: Record<string, unknown>) => Record<string, unknown>
  }
): ServerifyResult<R> {
  const result: Record<string, unknown> = {}

  for (const key in tree) {
    const value = tree[key]

    if (isServerSlot(value)) {
      result[key] = value.serverSlot({
        getState(this: VocabThis) {
          return getState.apply(this, [{
            serverContextKey: options.serverContextKey,
          }])
        },
      })

      delete (result[key] as Record<string, unknown>).serverSlot
      delete (result[key] as Record<string, unknown>).clientSlot
    } else if (
      value !== null &&
      typeof value === "object"
    ) {
      const childWrap = (x: Record<string, unknown>) => options.wrap({ [key]: x })
      result[key] = serverifyInner(value, {
        serverContextKey: options.serverContextKey,
        wrap: childWrap,
      })
    } else {
      result[key] = value
    }
  }

  result.seed = (input: Record<string, unknown>) => options.wrap(input)

  return result as ServerifyResult<R>
}

export function serverify<R extends object>(
  tree: R,
  serverifyOptions?: {
    clientContext?: Context<object>
  }
): ServerifyResult<R> {
  serverifyOptions ??= {}

  const debugMarker = Object.keys(tree).slice(0, 3).join("-")
  
  const serverContextKey = Symbol(debugMarker)

  return {
    ...serverifyInner(tree, {
      serverContextKey,
      wrap: (v) => v,
    }),
    StateVocabProvider({ children, value }) {
      value ??= {}

      setStateVocab(serverContextKey, value)

      return (
        <StateVocabClientProvider
          clientContext={
            serverifyOptions.clientContext as Context<VocabStore> | undefined
          }
          value={value}
        >
          {children}
        </StateVocabClientProvider>
      )
    }
  }
}

