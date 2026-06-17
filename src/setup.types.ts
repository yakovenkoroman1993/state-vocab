import { STATE_DEFINITION } from "./constants";

type Path<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends object
    ? T[K] extends { [STATE_DEFINITION]: unknown }
      ? `${Prefix}${K}` 
      : `${Prefix}${K}` | Path<T[K], `${Prefix}${K}.`>
    : `${Prefix}${K}`
}[keyof T & string];

export type InjectPathsOptions<T extends object> = {
  path: string
  verbose: boolean
  verbosePath: Path<T>
  ssr: boolean
}
