"use client"

import { pageStorage } from "@/context/page.storage"
import { clientify } from "@yakocloud/state-vocab/client"
import { PageClientContext } from "@/context/page.context.client";

export const pageClientStorage = clientify(pageStorage, {
  clientContext: PageClientContext
})
