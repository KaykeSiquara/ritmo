import "@kaykesiquara/prumo/styles.css";
import "@fontsource-variable/rethink-sans";
import "./theme.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { AppProviders } from "./app/App";
import { routes } from "./app/routes";
import { createStore, load } from "./store/store";
import "./styles.css";

const lang = typeof navigator !== "undefined" && /^pt\b/i.test(navigator.language) ? "pt" : "en";
const store = createStore(load(lang));
const router = createBrowserRouter(routes);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders store={store}><RouterProvider router={router} /></AppProviders>
  </StrictMode>,
);
