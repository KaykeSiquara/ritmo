import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { AppProviders } from "../app/App";
import { routes } from "../app/routes";
import { todayOf } from "../domain/dates";
import type { Lang } from "../domain/types";
import { seed } from "../store/seed";
import { createStore } from "../store/store";

export function renderApp(path = "/today", lang: Lang = "pt") {
  const store = createStore(seed(lang, todayOf()), false);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return { store, router, ...render(<AppProviders store={store}><RouterProvider router={router} /></AppProviders>) };
}
