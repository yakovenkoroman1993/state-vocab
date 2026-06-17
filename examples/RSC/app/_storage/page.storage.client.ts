"use client"

import { pageStorage } from "@/app/_storage/page.storage"
import { clientify } from "@yakocloud/state-vocab/client"

export const pageClientStorage = clientify(pageStorage)
