import { serverStorage } from "@/storage.server"
import ClientUserInfo from "./user-info"

export default async function ServerUserInfo() {
  const name = serverStorage.user.name.getState()
  console.log("!!! name", name)

  const role = serverStorage.user.role.getState()
  console.log("!!! role", role)
  return (
    <ClientUserInfo />
  )
}
