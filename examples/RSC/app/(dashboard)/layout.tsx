import { layoutServerStorage } from "@/app/_storage/layout.storage.server";
import { PropsWithChildren } from "react";

const LayoutStateVocabProvider = layoutServerStorage.StateVocabProvider

export default async function RootLayout({ children }: PropsWithChildren) {
  return (
    <LayoutStateVocabProvider
      value={{
        session: {
          id: 12345
        }
      }}
    >
      {children}
    </LayoutStateVocabProvider>
  );
}
