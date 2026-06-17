import { pageServerStorage } from "@/app/_storage/page.storage.server"
import ClientUserInfo from "./user-info.client"

export default async function ServerUserInfo() {
  const name = pageServerStorage.user.name.getState()
  const role = pageServerStorage.user.role.getState()
  const city = pageServerStorage.person.address.city.getState()

  return (
    <>
      <b>SSR:</b>
      <p>Name: <b>{name}</b></p>
      <p>Role: <b>{role}</b></p>
      <p>Person address: <b>City: {city}</b></p>
      <br /><hr /><br />
      <ClientUserInfo />
    </>
  )
}
