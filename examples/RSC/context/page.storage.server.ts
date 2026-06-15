import { serverify } from "@yakocloud/state-vocab/server"
import { pageStorage } from "@/context/page.storage"
import { PageClientContext } from "@/context/page.context.client";

export const pageServerStorage = serverify(pageStorage, {
  clientContext: PageClientContext,
})
