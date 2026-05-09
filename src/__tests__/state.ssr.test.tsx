
import { renderToString } from "react-dom/server";
import { createRoot, hydrateRoot } from "react-dom/client";
import { act } from "react";
import { setupStorage } from "../setup";
import { defineState } from "../state";
import { vi } from "vitest";

const storage = setupStorage({
  preference: {
    theme: defineState<string>({ storage: () => localStorage, defaultValue: "Dark" }),
  },
})

const MyComponent = () => {
  const [theme, setTheme] = storage.preference.theme.useState()

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
  const ssrHtml = renderToString(<MyComponent />);

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
    hydrateRoot(container, <MyComponent />);
  });

  expect(errors).toHaveLength(0);
  spy.mockRestore();
  container.remove();
});

test("ssr html matches client html", async () => {
  // 1. SSR snapshot
  const ssrHtml = renderToString(<MyComponent />);

  localStorage.setItem("preference.theme", "\"White\""); 
  // 2. Чистый клиентский рендер
  const clientContainer = document.createElement("div");
  document.body.appendChild(clientContainer);

  await act(async () => {
    createRoot(clientContainer).render(<MyComponent />);
  });

  const clientHtml = clientContainer.innerHTML;

  // 3. Нормализуем и сравниваем
  // React добавляет свои атрибуты при гидрации, поэтому сравниваем текст
  const normalize = (html: string) =>
    html
      .replace(/<!--[\s\S]*?-->/g, "")          // убираем React-комментарии
      .replace(/\s+/g, " ")                      // нормализуем пробелы
      .trim();

  expect(normalize(clientHtml)).toBe(normalize(ssrHtml));

  clientContainer.remove();
});