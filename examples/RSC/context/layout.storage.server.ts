import { serverify } from "@yakocloud/state-vocab/server"
import { layoutStorage } from "@/context/layout.storage";
import { LayoutClientContext } from "@/context/layout.context.client";

export const layoutServerStorage = serverify(layoutStorage, {
  clientContext: LayoutClientContext,
})
