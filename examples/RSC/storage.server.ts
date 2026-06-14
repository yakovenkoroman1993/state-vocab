import { storage } from "@/storage"
import { serverify } from "@yakocloud/state-vocab/server"

export const serverStorage = serverify(storage)
