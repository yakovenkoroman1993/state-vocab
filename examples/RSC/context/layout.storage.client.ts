"use client"

import { layoutStorage } from "@/context/layout.storage"
import { clientify } from "@yakocloud/state-vocab/client"
import { LayoutClientContext } from "@/context/layout.context.client";

export const layoutClientStorage = clientify(layoutStorage, {
  clientContext: LayoutClientContext
})
