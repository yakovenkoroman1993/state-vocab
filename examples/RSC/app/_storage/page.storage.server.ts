import { serverify } from "@yakocloud/state-vocab/server"
import { pageStorage } from "@/app/_storage/page.storage"

export const pageServerStorage = serverify(pageStorage)
