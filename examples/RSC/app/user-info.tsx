"use client"

import { clientStorage } from "@/storage.client"

export default function ClientUserInfo() {
  const [name] = clientStorage.user.name.useState()
  const [role] = clientStorage.user.role.useState()
  const [city] = clientStorage.person.address.city.useState()

  return (
    <div>
      <p>Name: <strong>{name}</strong></p>
      <p>Role: <strong>{role}</strong></p>
      <p>Person Address: <strong>City: {city}</strong></p>
    </div>
  )
}
