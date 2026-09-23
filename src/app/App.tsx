import { ToastProvider } from "@kaykesiquara/prumo";
import type { ReactNode } from "react";
import { LangProvider, useI18n } from "../i18n";
import type { Store } from "../store/store";
import { StoreProvider, useSelect } from "./context";

function Toasts({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return <ToastProvider dismissLabel={t("dismiss")}>{children}</ToastProvider>;
}

function Lang({ children }: { children: ReactNode }) {
  const lang = useSelect((s) => s.settings.lang);
  return <LangProvider lang={lang}><Toasts>{children}</Toasts></LangProvider>;
}

export function AppProviders({ store, children }: { store: Store; children: ReactNode }) {
  return <StoreProvider store={store}><Lang>{children}</Lang></StoreProvider>;
}
