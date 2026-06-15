import { defineState } from "@yakocloud/state-vocab"
import { setupStorage } from "@yakocloud/state-vocab"

export const storage = setupStorage({
  user: {
    name: defineState<string>(),
    role: defineState<string>(),
    id: defineState({
      defaultValue: -1
    }),
    payload: defineState<{
      hash: string
      userId: number
      email?: string
    }>()
  },
  person: {
    address: {
      city: defineState({ defaultValue: "" })
    }
  }
})

