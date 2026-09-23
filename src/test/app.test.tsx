import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { addDays, todayOf } from "../domain/dates";
import { renderApp } from "./render";

const h1 = (name: string | RegExp) => screen.findByRole("heading", { level: 1, name });
const status = () => screen.getByRole("status");

describe("quick add", () => {
  it("shows what it understood and adds the task", async () => {
    const user = userEvent.setup();
    const { store } = renderApp("/today");
    await h1("Hoje");
    await user.type(screen.getByLabelText("Adicionar tarefa", { selector: "input" }), "Comprar pão amanhã 9h #pessoal !alta");
    const preview = screen.getByText("Amanhã").closest("p")!;
    for (const chip of ["Amanhã", "09:00", "#Pessoal", "Alta"]) expect(within(preview).getByText(chip)).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(status()).toHaveTextContent("Tarefa adicionada.");
    expect(store.get().tasks.at(-1)).toMatchObject({ title: "Comprar pão", due: addDays(todayOf(), 1), time: "09:00", priority: "high", projectId: "p2" });
    expect(screen.getByLabelText("Adicionar tarefa", { selector: "input" })).toHaveValue("");
  });
  it("warns about a project that does not exist", async () => {
    const user = userEvent.setup();
    renderApp("/inbox");
    await h1("Caixa de entrada");
    await user.type(screen.getByLabelText("Adicionar tarefa", { selector: "input" }), "Algo #mercado");
    expect(screen.getByText(/Não existe projeto chamado “mercado”/)).toBeInTheDocument();
  });
});

describe("tasks", () => {
  it("completes a task and undoes it from the toast", async () => {
    const user = userEvent.setup();
    const { store } = renderApp("/today");
    await h1("Hoje");
    await user.click(screen.getByRole("checkbox", { name: "Concluir “Revisar o contrato do fornecedor”" }));
    await waitFor(() => expect(store.get().tasks.find((t) => t.id === "t2")!.status).toBe("done"));
    await user.click(within(status()).getByRole("button", { name: "Desfazer" }));
    expect(store.get().tasks.find((t) => t.id === "t2")!.status).toBe("doing");
  });
  it("keeps a repeating task visible in its list after completing and undoing it", async () => {
    const user = userEvent.setup();
    const { store } = renderApp("/projects/p1");
    await h1("Trabalho");
    const row = () => screen.getByRole("button", { name: /^Responder os e-mails da manhã/ }).closest("li")!;
    const dueBefore = store.get().tasks.find((t) => t.id === "t3")!.due;
    await user.click(screen.getByRole("checkbox", { name: "Concluir “Responder os e-mails da manhã”" }));
    await waitFor(() => expect(store.get().tasks.find((t) => t.id === "t3")!.due).not.toBe(dueBefore));
    await waitFor(() => expect(row()).not.toHaveAttribute("data-leaving"));
    expect(within(row()).getByRole("checkbox")).not.toBeChecked();
    await user.click(within(status()).getByRole("button", { name: "Desfazer" }));
    expect(store.get().tasks.find((t) => t.id === "t3")!.due).toBe(dueBefore);
    await waitFor(() => expect(row()).not.toHaveAttribute("data-leaving"));
  });

  it("moves through a list with the arrows and completes with X", async () => {
    const user = userEvent.setup();
    const { store } = renderApp("/today");
    await h1("Hoje");
    const list = screen.getByRole("list", { name: "Hoje" });
    const titles = within(list).getAllByRole("button");
    titles[0].focus();
    await user.keyboard("{ArrowDown}");
    expect(titles[1]).toHaveFocus();
    const title = titles[1].textContent!.split(",")[0];
    await user.keyboard("x");
    await waitFor(() => expect(store.get().tasks.find((t) => t.title === title && t.status === "done")).toBeTruthy());
  });
  it("opens the task in a sheet from the address, edits it and closes with Esc", async () => {
    const user = userEvent.setup();
    const { store, router } = renderApp("/today");
    await h1("Hoje");
    await user.click(screen.getByRole("button", { name: /^Enviar a prestação de contas de setembro/ }));
    const sheet = await screen.findByRole("dialog", { name: "Enviar a prestação de contas de setembro" });
    expect(router.state.location.search).toBe("?task=t1");
    await user.selectOptions(within(sheet).getByLabelText("Prioridade"), "low");
    expect(store.get().tasks[0].priority).toBe("low");
    await user.type(within(sheet).getByPlaceholderText("Adicionar subtarefa"), "Assinar{Enter}");
    expect(store.get().tasks[0].subtasks.map((s) => s.title)).toContain("Assinar");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(router.state.location.search).toBe(""));
  });
  it("moves a card on the board without a mouse", async () => {
    const user = userEvent.setup();
    const { store } = renderApp("/projects/p1");
    await h1("Trabalho");
    await user.click(screen.getByRole("tab", { name: "Quadro" }));
    const todo = screen.getByRole("list", { name: /A fazer/ });
    const trigger = within(todo).getByRole("button", { name: "Ações de “Enviar a prestação de contas de setembro”" });
    trigger.focus();
    await user.keyboard("{Enter}");
    await user.click(await screen.findByRole("menuitem", { name: "Fazendo" }));
    expect(store.get().tasks[0].status).toBe("doing");
    expect(status()).toHaveTextContent("movida para Fazendo");
    expect(within(screen.getByRole("list", { name: /Fazendo/ })).getByText("Enviar a prestação de contas de setembro")).toBeInTheDocument();
  });
});

describe("focus and habits", () => {
  it("records a session when the focus timer ends and moves to a break", async () => {
    const user = userEvent.setup();
    const { store } = renderApp("/focus");
    await h1("Foco");
    await user.click(screen.getByRole("button", { name: "Começar" }));
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();
    const before = store.get().sessions.length;
    act(() => store.dispatch({ type: "timer/set", timer: { ...store.get().timer, running: true, endsAt: Date.now() - 1 } }));
    await waitFor(() => expect(store.get().sessions.length).toBe(before + 1));
    expect(await screen.findByText("Pausa curta")).toBeInTheDocument();
    expect(status()).toHaveTextContent("Sessão de foco concluída");
  });
  it("marks a habit for today and moves through the heatmap with the arrows", async () => {
    const user = userEvent.setup();
    renderApp("/habits");
    await h1("Hábitos");
    const today = screen.getByRole("button", { name: "Marcar “Ler 20 minutos” como feito hoje" });
    expect(today).toHaveAttribute("aria-pressed", "false");
    await user.click(today);
    expect(today).toHaveAttribute("aria-pressed", "true");
    const grid = screen.getByRole("grid", { name: /Ler 20 minutos/ });
    const focusable = within(grid).getAllByRole("button").filter((b) => b.tabIndex === 0);
    expect(focusable).toHaveLength(1);
    focusable[0].focus();
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).not.toBe(focusable[0]);
    expect(within(grid).getAllByRole("button").filter((b) => b.tabIndex === 0)).toHaveLength(1);
  });
});

describe("navigation", () => {
  it("jumps anywhere from the command palette", async () => {
    const user = userEvent.setup();
    renderApp("/today");
    await h1("Hoje");
    await user.keyboard("{Control>}k{/Control}");
    const box = await screen.findByRole("combobox", { name: "Buscar ou ir para" });
    await user.type(box, "hab");
    expect(box).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await h1("Hábitos")).toBeInTheDocument();
  });
  it("finds tasks from the palette and opens them", async () => {
    const user = userEvent.setup();
    const { router } = renderApp("/today");
    await h1("Hoje");
    await user.keyboard("{Control>}k{/Control}");
    await user.type(await screen.findByRole("combobox"), "passaporte");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(router.state.location.search).toContain("task=t10"));
  });
  it("follows the G shortcuts and shows the shortcut list", async () => {
    const user = userEvent.setup();
    renderApp("/today");
    await h1("Hoje");
    document.body.focus();
    await user.keyboard("gi");
    expect(await h1("Caixa de entrada")).toBeInTheDocument();
    await user.keyboard("?");
    expect(await screen.findByRole("dialog", { name: "Atalhos de teclado" })).toBeInTheDocument();
  });
  it("switches the language of the whole app", async () => {
    const user = userEvent.setup();
    const { store } = renderApp("/today");
    await h1("Hoje");
    await user.click(screen.getByRole("button", { name: "Read in English" }));
    expect(await h1("Today")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Pay the electricity bill/ })).toBeInTheDocument();
    expect(screen.queryByText("Pagar a conta de luz")).not.toBeInTheDocument();
    expect(store.get().settings.lang).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });
  it("creates a project and opens it", async () => {
    const user = userEvent.setup();
    const { store } = renderApp("/today");
    await h1("Hoje");
    await user.click(screen.getAllByRole("button", { name: "Novo projeto" })[0]);
    const dialog = await screen.findByRole("dialog", { name: "Novo projeto" });
    await user.click(within(dialog).getByRole("button", { name: "Criar projeto" }));
    expect(within(dialog).getByLabelText("Nome do projeto")).toHaveAccessibleDescription("O projeto precisa de um nome.");
    await user.type(within(dialog).getByLabelText("Nome do projeto"), "Casa");
    await user.click(within(dialog).getByRole("radio", { name: "Verde" }));
    await user.click(within(dialog).getByRole("button", { name: "Criar projeto" }));
    expect(await h1("Casa")).toBeInTheDocument();
    expect(store.get().projects.at(-1)).toMatchObject({ name: "Casa", color: "green" });
  });
  it("refuses a file that is not a Ritmo export", async () => {
    renderApp("/settings");
    await h1("Configurações");
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["{\"hello\":1}"], "x.json", { type: "application/json" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(status()).toHaveTextContent("Esse arquivo não é uma exportação do Ritmo."));
  });
});

const PATHS = ["/today", "/upcoming", "/inbox", "/projects/p1", "/focus", "/habits", "/insights", "/settings", "/nothing"];
describe.each(["pt", "en"] as const)("accessibility in %s", (lang) => {
  it.each(PATHS)("%s has no WCAG 2.1 A or AA violations", async (path) => {
    renderApp(path, lang);
    await screen.findByRole("heading", { level: 1 });
    const r = await axe.run(document.body, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }, rules: { "color-contrast": { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
});
