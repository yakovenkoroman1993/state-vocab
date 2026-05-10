import { STATE_DEFINITION, STATE_PATH, STATE_SSR, STATE_VERBOSE } from "./constants";

type InjectPathsOptions = {
  path: string
  verbose: boolean
  ssr: boolean
}

/**
 * Recursively traverses a router object and injects the current path (STATE_PATH)
 * into every leaf node of the tree.
 *
 * @param router  - Nested object representing a route/state hierarchy
 * @param path    - Accumulated dot-separated path from the root to the current node (e.g. "queue.email.send")
 * @param verbose - enable verbose logs
 * @param ssr     - SSR supporting
 * @returns A Proxy over the router with paths automatically injected into leaf nodes
 */
function injectPaths<T extends object>(
  router: T,
  options: Partial<InjectPathsOptions> & {
    cache: {
      proxy: WeakMap<object, Map<string, object>>
      leaf: WeakMap<object, Map<string, object>>
    }
  }
): T {
  const {
    path = "",
    verbose,
    ssr,
    cache
  } = options

  let pathCache = cache.proxy.get(router)
  
  if (!pathCache) {
    pathCache = new Map()
    cache.proxy.set(router, pathCache)
  }

  const cached = pathCache.get(path)

  if (cached) {
    return cached as T
  }

  const proxy = new Proxy(router, {
    get(target: T, prop: string | symbol) {
      const value = target[prop as keyof T];

      // Build the path to the current property: "parent.child", or just "child" at the root
      const statePath = path ? `${path}.${String(prop)}` : String(prop);

      // A leaf node is an object marked with the STATE_DEFINITION symbol
      if (value && typeof value === "object" && STATE_DEFINITION in value) {
        const leaf = value as Record<string, (...args: unknown[]) => unknown>;

        let leafPathCache = cache.leaf.get(leaf)
        if (!leafPathCache) {
          leafPathCache = new Map()
          cache.leaf.set(leaf, leafPathCache)
        }

        const cachedLeaf = leafPathCache.get(statePath)
        if (cachedLeaf) {
          return cachedLeaf
        }

        // Collect only the methods (functions) defined on the leaf; skip other properties
        const methods = Reflect.ownKeys(leaf).filter(
          (k) => typeof leaf[k as keyof typeof leaf] === "function"
        );

        // Wrap each method so that `this` contains STATE_PATH with the resolved path at call time
        const extended = Object.fromEntries(
          methods.map((method) => [
            method,
            (...args: unknown[]) =>
              leaf[method as keyof typeof leaf].call(
                {
                  ...leaf,
                  [STATE_PATH]: statePath,
                  [STATE_VERBOSE]: verbose,
                  [STATE_SSR]: ssr,
                },
                ...args
              ),
          ])
        );

        // Merge the original leaf with the wrapped methods and return
        const result = { ...leaf, ...extended };

        leafPathCache.set(statePath, result)

        return result
      }

      // Intermediate node — recurse deeper, accumulating the path
      if (value && typeof value === "object") {
        return injectPaths(value, {
          ...options,
          path: statePath,
        });
      }

      // Primitive value — return as-is
      return value;
    },
  });

  pathCache.set(path, proxy)

  return proxy
}

export function setupStorage<T extends object>(
  native: T,
  options?: Partial<Omit<InjectPathsOptions, "path">>
): T {
  return injectPaths(native, {
    ...options,
    cache: {
      proxy: new WeakMap<object, Map<string, object>>(),
      leaf: new WeakMap<object, Map<string, object>>(),
    }
  })
}
