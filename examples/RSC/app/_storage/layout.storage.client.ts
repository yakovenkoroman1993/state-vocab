"use client"

import { LayoutClientContext } from "@/app/_storage/layout.context.client"
import { layoutStorage } from "@/app/_storage/layout.storage"
import { clientify } from "@yakocloud/state-vocab/client"

export const layoutClientStorage = clientify(layoutStorage, {
  clientContext: LayoutClientContext
})
