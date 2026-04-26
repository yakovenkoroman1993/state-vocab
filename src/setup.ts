import { STATE_DEFINITION, STATE_PATH, STATE_SSR } from "./constants";

const proxyCache = new WeakMap<object, Map<string, object>>()
const leafCache = new WeakMap<object, Map<string, object>>()

/**
 * Recursively traverses a router object and injects the current path (STATE_PATH)
 * into every leaf node of the tree.
 *
 * @param router - Nested object representing a route/state hierarchy
 * @param path   - Accumulated dot-separated path from the root to the current node (e.g. "queue.email.send")
 * @param ssr    - enable SSR support
 * @returns A Proxy over the router with paths automatically injected into leaf nodes
 */
function injectPaths<T extends object>(
  router: T,
  options?: Partial<{
    path: string
    ssr: boolean
  }>
): T {
  options ??= {}

  const {
    path = "",
    ssr,
  } = options

  let pathCache = proxyCache.get(router)
  
  if (!pathCache) {
    pathCache = new Map()
    proxyCache.set(router, pathCache)
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

        let leafPathCache = leafCache.get(leaf)
        if (!leafPathCache) {
          leafPathCache = new Map()
          leafCache.set(leaf, leafPathCache)
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
          path: statePath,
          ssr,
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
  options?: Partial<{
    ssr: boolean
  }>
): T {
  return injectPaths(native, options);
}
