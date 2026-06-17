import { defineState, setupStorage } from "@yakocloud/state-vocab"

export const layoutStorage = setupStorage({
  session: defineState<{
    id: number
  }>({
    defaultValue: {
      id: -1
    }
  }),
}, {
  verbose: true,
  verbosePath: "session",
})

