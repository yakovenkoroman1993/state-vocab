import ServerUserInfo from "@/app/(dashboard)/settings/user-info.server";
import { layoutServerStorage } from "@/context/layout.storage.server";
import { pageServerStorage } from "@/context/page.storage.server";

const PageStateVocabProvider = pageServerStorage.StateVocabProvider

export default async function Home() {
  pageServerStorage.start()
  
  const session = await layoutServerStorage.session.getState()

  return (
    <div style={{ padding: 32, fontFamily: "monospace" }}>
      <p>SESSION ID (page.tsx): <b>{session.id}</b></p>
      <hr />
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
    </div>
  )
}
