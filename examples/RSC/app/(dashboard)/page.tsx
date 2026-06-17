import ServerUserInfo from "@/app/(dashboard)/settings/user-info.server";
import { pageServerStorage } from "@/app/_storage/page.storage.server";
import Link from "next/link";

const PageStateVocabProvider = pageServerStorage.StateVocabProvider

export default async function Home() {
  return (
    <div style={{ padding: 32, fontFamily: "monospace" }}>
      <Link href="/settings">TO SETTINGS</Link>
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
