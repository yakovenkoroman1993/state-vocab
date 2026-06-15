
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { act } from "react";
import { clientify } from "../setup.client";
import { setupStorage } from "../setup";
import { defineState } from "../state";
import { vi } from "vitest";
import { StateVocabClientProvider } from "../provider.client";

const storage = setupStorage({
  preference: {
    theme: defineState<string>({ storage: () => localStorage, defaultValue: "Dark" }),
  },
})

const clientStorage = clientify(storage)

const MyComponent = () => {
  const [theme, setTheme] = clientStorage.preference.theme.useState()

  return (
    <div>
      <p>Theme: {theme}</p>
      <button onClick={() => setTheme((prev) => prev + "A")}>
        Update
      </button>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear();
});

test("ssr/client hydration match", async () => {
  // 1. SSR
  const ssrHtml = renderToString(
    <StateVocabClientProvider>
      <MyComponent />
    </StateVocabClientProvider>
  );

  localStorage.setItem("preference.theme", "\"White\""); 
  // 2. put SSR into DOM
  const container = document.createElement("div");
  container.innerHTML = ssrHtml;
  document.body.appendChild(container);

  // 3. Hidration and error catching
  const errors: string[] = [];
  const spy = vi.spyOn(console, "error").mockImplementation((msg) => {
    if (typeof msg === "string" && msg.includes("Hydration")) {
      errors.push(msg);
    }
  });

  await act(async () => {
    hydrateRoot(
      container,
      <StateVocabClientProvider>
        <MyComponent />
      </StateVocabClientProvider>
    );
  });

  expect(errors).toHaveLength(0);
  spy.mockRestore();
  container.remove();
});