"use client"

import { layoutClientStorage } from "@/app/_storage/layout.storage.client"
import { pageClientStorage } from "@/app/_storage/page.storage.client"


export default function ClientUserInfo() {
  const [name] = pageClientStorage.user.name.useState()
  const [role] = pageClientStorage.user.role.useState()
  const [city] = pageClientStorage.person.address.city.useState()
  
  const [session] = layoutClientStorage.session.useState()

  return (
    <div>
      <b>CSR:</b>
      <p>Session ID: <b>{session?.id}</b></p>
      <p>Name: <strong>{name}</strong></p>
      <p>Role: <strong>{role}</strong></p>
      <p>Person Address: <strong>City: {city}</strong></p>
    </div>
  )
}
