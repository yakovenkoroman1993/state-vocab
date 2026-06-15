import { serverStorage } from "@/storage.server"
import ClientUserInfo from "./user-info"

export default async function ServerUserInfo() {
  const name = serverStorage.user.name.getState()

  const role = serverStorage.user.role.getState()
  return (
    <>
      {name} - {role}
      <ClientUserInfo />
    </>
  )
}
