import { pageServerStorage } from "@/context/page.storage.server"
import ClientUserInfo from "./user-info.client"
import { layoutServerStorage } from "@/context/layout.storage.server"

export default async function ServerUserInfo() {
  const name = await pageServerStorage.user.name.getState()
  const role = await pageServerStorage.user.role.getState()
  const city = await pageServerStorage.person.address.city.getState()

  const session = await layoutServerStorage.session.getState()

  return (
    <>
      <b>SSR:</b>
      <p>Session ID: <b>{session?.id}</b></p>
      <p>Name: <b>{name}</b></p>
      <p>Role: <b>{role}</b></p>
      <p>Person address: <b>City: {city}</b></p>
      <br /><hr /><br />
      <ClientUserInfo />
    </>
  )
}
