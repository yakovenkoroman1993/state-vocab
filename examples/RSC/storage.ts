import { defineState } from "@yakocloud/state-vocab"
import { setupStorage } from "@yakocloud/state-vocab"

export const storage = setupStorage({
  user: {
    name: defineState<string>(),
    role: defineState<string>(),
  },
  person: {
    address: {
      city: defineState({ defaultValue: "" })
    }
  }
})

