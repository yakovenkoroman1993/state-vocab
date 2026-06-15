import { serverStorage } from "@/storage.server";
import ServerUserInfo from "./user-info.server"

const { StateVocabProvider } = serverStorage

export default async function Home() {
  return (
    <main style={{ padding: 32, fontFamily: "monospace" }}>
      <h1>state-vocab SSR test</h1>
      <p>Values set via <code>getState</code> on the server:</p>

      <StateVocabProvider
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
      </StateVocabProvider>
      
    </main>
  )
}
