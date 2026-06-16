import type { Context, PropsWithChildren, ReactNode } from "react";
import { STATE_PATH } from "./constants";
import {
  getRequestStore,
  getStateVocab
} from "./context.server";
import { StateVocabClientProvider } from "./provider.client";
import type { Vocab, VocabThis } from "./state.types";
import { get, withTimeout } from "./utils";
import VocabStore from "./store";

const ERROR_MESSAGE = "Make sure your component is wrapped in StateVocabProvider"

async function getState<V>(
  this: VocabThis,
  options: {
    timeout: number
    serverContextKey: symbol
  }
): Promise<V> {
  const statePath = this[STATE_PATH];

  const vocab = await withTimeout(
    getStateVocab(options.serverContextKey),
    options.timeout,
    `Failed access to "${statePath}". Reason: Operation timed out after ${options.timeout}ms. ${ERROR_MESSAGE}.`
  )

  if (!vocab) {
    throw new Error(ERROR_MESSAGE)
  }

  return get(vocab, statePath) as V
}

type Placeholder<V> = {
  getState(): Promise<V>
}

type Slot<V> = {
  serverSlot(input: Placeholder<V>): Placeholder<V>
}

type SlotValue<T> =
  T extends { serverSlot(input: { getState(this: VocabThis): infer V }): unknown }
    ? V
    : never

type ServerifiedValue<R> = {
  [K in keyof R]?:
    [SlotValue<R[K]>] extends [never]
      ? R[K] extends object
        ? ServerifiedValue<R[K]>
        : R[K]
      : SlotValue<R[K]>
}

type Serverified<R> =
  [SlotValue<R>] extends [never]
    ? R extends object
      ? { seed(input: ServerifiedValue<R>): Vocab } & { [K in keyof R]: Serverified<R[K]> }
      : R
    : Placeholder<SlotValue<R>>


type ServerifyResult<R extends object> =
  {
    start(): void
    seed(input: ServerifiedValue<R>): Vocab
    StateVocabProvider(props: PropsWithChildren<{ value?: ServerifiedValue<R> }>): ReactNode
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
    serverTimeout: number
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
            timeout: options.serverTimeout
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
        serverTimeout: options.serverTimeout,
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
    serverTimeout?: number
  }
): ServerifyResult<R> {
  const debugMarker = Object.keys(tree).slice(0, 3).join("-")
  
  const serverContextKey = Symbol(debugMarker)

  const resolver = Promise.withResolvers<Vocab>()
  
  return {
    ...serverifyInner(tree, {
      serverContextKey,
      serverTimeout: serverifyOptions.serverTimeout ?? 1000,
      wrap: (v) => v,
    }),
    start() {
      const { size } = getRequestStore()
      
      const testContextKey = Symbol("test")
      getRequestStore().set(testContextKey, resolver.promise)
      if (getRequestStore().size === size) {
        throw new Error("Start execution only within a React render context (per-request)")
      } else {
        getRequestStore().delete(testContextKey)
      }

      getRequestStore().set(serverContextKey, resolver.promise)
    },
    StateVocabProvider({ children, value }) {
      value ??= {}
      resolver.resolve(value)

      return (
        <StateVocabClientProvider
          clientContext={serverifyOptions.clientContext as Context<VocabStore>}
          value={value}
        >
          {children}
        </StateVocabClientProvider>
      )
    }
  }
}

