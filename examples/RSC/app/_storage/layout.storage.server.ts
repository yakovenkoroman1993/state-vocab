import { LayoutClientContext } from "@/app/_storage/layout.context.client"
import { layoutStorage } from "@/app/_storage/layout.storage"
import { serverify } from "@yakocloud/state-vocab/server"

export const layoutServerStorage = serverify(layoutStorage, {
  clientContext: LayoutClientContext,
})
