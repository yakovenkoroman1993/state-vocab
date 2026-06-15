import { pageServerStorage } from "@/context/page.storage.server";
import ServerUserInfo from "./user-info.server"

const PageStateVocabProvider = pageServerStorage.StateVocabProvider

export default async function Home() {
  return (
    <main style={{ padding: 32, fontFamily: "monospace" }}>
      <PageStateVocabProvider
        value={{
          user: {
            name: "Name",
            role: "Role",
            id: 1,
            payload: {
              hash: "abcd",
              userId: 1,
              email: "test@test.tst",
            }
          },
          person: {
            address: {
              city: "NY"
            }
          }
        }}
      >
        <ServerUserInfo />
      </PageStateVocabProvider>
    </main>
  )
}
