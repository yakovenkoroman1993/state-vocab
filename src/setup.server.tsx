import type { Context, PropsWithChildren, ReactNode } from "react";
import { STATE_PATH } from "./constants";
import { getStateVocab } from "./context.server";
import { StateVocabProvider } from "./provider";
import type { Vocab, VocabThis } from "./state.types";
import { get } from "./utils";
import VocabStore from "./store";

const ERROR_MESSAGE = "Make sure your component is wrapped in StateVocabProvider"

function getState<V>(
  this: VocabThis,
  options: {
    serverContextKey: symbol
  }
): V {
  const statePath = this[STATE_PATH];

  const vocab = getStateVocab(options.serverContextKey)

  if (!vocab) {
    throw new Error(ERROR_MESSAGE)
  }

  return get(vocab, statePath) as V
}

type Placeholder<V> = {
  getState(): V
}

type Slot<V> = {
  serverSlot(input: Placeholder<V>): Placeholder<V>
}

type ServerifiedValue<R> = {
  [K in keyof R]?:
    R[K] extends Slot<infer V>
      ? V
      : R[K] extends object
        ? ServerifiedValue<R[K]>
        : R[K]
}

type Serverified<R> =
  R extends Slot<infer TValue>
    ? Placeholder<TValue>
    : R extends object
      ? { seed(input: ServerifiedValue<R>): Vocab } & { [K in keyof R]: Serverified<R[K]> }
      : R


type ServerifyResult<R extends object> =
  {
    seed(input: ServerifiedValue<R>): Vocab
    StateVocabProvider(props: PropsWithChildren<{ value?: ServerifiedValue<R> }>): Promise<ReactNode>
  } & {
    [K in keyof R]: Serverified<R[K]>
  }

function isSlot(value: unknown): value is Slot<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "serverSlot" in value
  )
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

    if (isSlot(value)) {
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
  serverifyOptions: {
    clientContext: Context<object>
  }
): ServerifyResult<R> {
  const serverContextKey = Symbol()

  return {
    ...serverifyInner(tree, {
      serverContextKey,
      wrap: (x) => x,
    }),
    StateVocabProvider({ children, value }) {
      return (
        <StateVocabProvider
          clientContext={serverifyOptions.clientContext as Context<VocabStore>}
          serverContextKey={serverContextKey}
          value={value as Vocab}
        >
          {children}
        </StateVocabProvider>
      )
    }
  }
}

