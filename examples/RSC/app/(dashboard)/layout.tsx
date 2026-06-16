import { PropsWithChildren } from "react";
import { layoutServerStorage } from "@/context/layout.storage.server";

const LayoutStateVocabProvider = layoutServerStorage.StateVocabProvider

export default async function RootLayout({ children }: PropsWithChildren) {
  layoutServerStorage.start()
  
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
