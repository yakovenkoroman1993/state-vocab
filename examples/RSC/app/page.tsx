import { serverStorage } from "@/storage.server";
import ServerUserInfo from "./user-info.server"
import { StateVocabProvider } from "@yakocloud/state-vocab/server";

export default async function Home() {
  return (
    <main style={{ padding: 32, fontFamily: "monospace" }}>
      <h1>state-vocab SSR test</h1>
      <p>Values set via <code>getState</code> on the server:</p>

      <StateVocabProvider
        value={serverStorage.set({
          user: {
            name: "Name",
            role: "Role",
          },
          person: {
            address: {
              city: "NY"
            }
          }
        })}
      >
        <ServerUserInfo />
      </StateVocabProvider>
      
    </main>
  )
}
