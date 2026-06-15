import type { PropsWithChildren, ReactNode } from "react";
import { STATE_PATH, STATE_SSR, STATE_VERBOSE, STATE_VERBOSE_PATH } from "./constants";
import { getStateVocab } from "./context.server";
import { StateVocabProvider } from "./provider";
import type { Vocab, VocabThis } from "./state.types";
import { get } from "./utils";

const ERROR_MESSAGE = "Make sure your component is wrapped in StateVocabProvider"

function getState<V>(
  this: {
    [STATE_PATH]: string;
    [STATE_VERBOSE]: boolean;
    [STATE_VERBOSE_PATH]: string;
    [STATE_SSR]: boolean;
  },
): V {
  const statePath = this[STATE_PATH];

  const vocab = getStateVocab()

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
  wrap: (x: Record<string, unknown>) => Record<string, unknown>
): ServerifyResult<R> {
  const result: Record<string, unknown> = {}

  for (const key in tree) {
    const value = tree[key]

    if (isSlot(value)) {
      result[key] = value.serverSlot({
        // Slot definition
        getState(this: VocabThis, ...args) {
          return getState.apply(this, args)
        },
      })

      delete (result[key] as Record<string, unknown>).serverSlot
      delete (result[key] as Record<string, unknown>).clientSlot
    } else if (
      value !== null &&
      typeof value === "object"
    ) {
      const childWrap = (x: Record<string, unknown>) => wrap({ [key]: x })
      result[key] = serverifyInner(value, childWrap)
    } else {
      result[key] = value
    }
  }

  result.seed = (input: Record<string, unknown>) => wrap(input)

  return result as ServerifyResult<R>
}

export function serverify<R extends object>(tree: R): ServerifyResult<R> {
  return {
    ...serverifyInner(tree, (x) => x),
    StateVocabProvider({ children, value }) {
      return (
        <StateVocabProvider value={value as Vocab}>
          {children}
        </StateVocabProvider>
      )
    }
  }
}

