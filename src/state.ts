// use both client and server
import { STATE_DEFINITION, STATE_PATH, STATE_SSR, STATE_VERBOSE, STATE_VERBOSE_PATH } from "./constants";
import type { Deserialize, Serialize, ValueOrFactory, ValueOrTransformer, VocabThis } from "./state.types";
import { valueOrFactory } from "./utils";

export function defineState<V>(
  superOptions: {
    defaultValue?: ValueOrFactory<V>
    bidirectional?: true
    storage?: unknown
    serialize?: Serialize<V>
    deserialize?: Deserialize<V>
  } = {}
) {
  return {
    [STATE_DEFINITION]: true,         // marks this object as a leaf in the router tree
    [STATE_PATH]: "",                 // placeholder; injected at runtime by injectPaths()
    [STATE_VERBOSE]: false,           // placeholder
    [STATE_VERBOSE_PATH]: "",         // placeholder
    [STATE_SSR]: false,               // placeholder

    serverSlot(
      this: VocabThis,
      input: {
        // RSC
        getState(
          this: VocabThis,
        ): V
      },
    ) {
      return Object.assign(this, {
        // Impl|RSC
        getState(...args) {
          return input.getState.apply(this, args)
        },
      } satisfies typeof input)
    },
    clientSlot(
      this: VocabThis,
      input: {
        // RCC
        useState(
          this: VocabThis,
          options?: {
            defaultValue?: ValueOrFactory<V>
            delayedSet?: number
            bidirectional?: true
            onSet?(nextValue: NoInfer<V>, prevValue: NoInfer<V>): void
            storage?: unknown
            serialize?: Serialize<V>
            deserialize?: Deserialize<V>
          }
        ): readonly [
          V, 
          (v: ValueOrTransformer<V>) => void,
          () => void,
        ]
        
        // RCC
        useInitialState(
          this: VocabThis,
          options: {
            defaultValue: ValueOrFactory<V>
            storage?: unknown
            serialize?: Serialize<V>
            deserialize?: Deserialize<V>
          }
        ): void
      },
    ) {
      return Object.assign(this, {
        // Impl|RCC
        useState(options) {
          options ??= {}
          return input.useState.apply(this, [{
            defaultValue: valueOrFactory(options.defaultValue) ?? valueOrFactory(superOptions.defaultValue),
            bidirectional: options.bidirectional ?? superOptions.bidirectional,
            storage: options.storage ?? superOptions.storage,
            serialize: superOptions.serialize ?? JSON.stringify,
            deserialize: superOptions.deserialize ?? JSON.parse,
            delayedSet: options.delayedSet,
            onSet(...args) {
              if (options.onSet) options.onSet(...args)
            }
          }])
        },
        // Impl|RCC
        useInitialState(options) {
          input.useInitialState.apply(this, [{
            defaultValue: options.defaultValue,
            storage: superOptions.storage,
            serialize: superOptions.serialize,
            deserialize: superOptions.deserialize,
          }])
        },
      } satisfies typeof input)
    },

    /** Returns the fully qualified state name (dot-separated path). */
    toString(this: { [STATE_PATH]: string }) {
      return this[STATE_PATH];
    },
  };
}