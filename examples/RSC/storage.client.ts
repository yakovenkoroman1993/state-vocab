"use client"

import { storage } from "@/storage"
import { clientify } from "@yakocloud/state-vocab/client"

export const clientStorage = clientify(storage)
