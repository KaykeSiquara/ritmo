import type { Habit, Lang, Priority, Repeat, Status } from "../domain/types";
import type { State } from "./state";

export const TEXT = {
  pt: {
    projects: ["Trabalho", "Pessoal", "Estudos"],
    tasks: [
      ["Enviar a prestação de contas de setembro", 0, 0, "high", "none", "todo", "10:00"], ["Revisar o contrato do fornecedor", 0, 0, "medium", "none", "doing", null],
      ["Responder os e-mails da manhã", 0, 0, "none", "weekdays", "todo", "09:00"], ["Pagar a conta de luz", 1, -1, "high", "monthly", "todo", null],
      ["Preparar a apresentação do trimestre", 0, 1, "high", "none", "todo", "14:00"], ["Reunião de equipe", 0, 5, "medium", "weekly", "todo", "10:00"],
      ["Comprar presente de aniversário da Ana", 1, 2, "medium", "none", "todo", null], ["Estudar capítulo 4 de TypeScript", 2, 0, "medium", "daily", "todo", "20:00"],
      ["Assistir à aula de acessibilidade", 2, 3, "low", "none", "todo", null], ["Renovar o passaporte", 1, 12, "low", "none", "todo", null],
      ["Organizar as fotos da viagem", 1, null, "none", "none", "todo", null], ["Ler o artigo sobre OKLCH", null, null, "low", "none", "todo", null],
      ["Atualizar o portfólio", 0, 4, "medium", "none", "todo", null], ["Configurar o CI do projeto", 0, null, "none", "none", "doing", null],
    ] as [string, number | null, number | null, Priority, Repeat, Status, string | null][],
    subtasks: ["Conferir os comprovantes", "Anexar as notas fiscais", "Enviar para a coordenação"],
    notes: "Os comprovantes estão na pasta compartilhada do financeiro.",
    done: ["Fechar o caixa da semana", "Ligar para o contador", "Revisar o orçamento", "Enviar o relatório mensal", "Atualizar a planilha de metas", "Marcar dentista", "Responder a Rita", "Estudar CSS Grid"],
    habits: [["Ler 20 minutos", "daily"], ["Exercício", "weekdays"], ["Beber 2 litros de água", "daily"]] as [string, Habit["schedule"]][],
  },
  en: {
    projects: ["Work", "Personal", "Studies"],
    tasks: [
      ["Send the September financial report", 0, 0, "high", "none", "todo", "10:00"], ["Review the supplier contract", 0, 0, "medium", "none", "doing", null],
      ["Answer the morning emails", 0, 0, "none", "weekdays", "todo", "09:00"], ["Pay the electricity bill", 1, -1, "high", "monthly", "todo", null],
      ["Prepare the quarterly presentation", 0, 1, "high", "none", "todo", "14:00"], ["Team meeting", 0, 5, "medium", "weekly", "todo", "10:00"],
      ["Buy Ana's birthday present", 1, 2, "medium", "none", "todo", null], ["Study chapter 4 of TypeScript", 2, 0, "medium", "daily", "todo", "20:00"],
      ["Watch the accessibility class", 2, 3, "low", "none", "todo", null], ["Renew the passport", 1, 12, "low", "none", "todo", null],
      ["Sort the trip photos", 1, null, "none", "none", "todo", null], ["Read the article about OKLCH", null, null, "low", "none", "todo", null],
      ["Update the portfolio", 0, 4, "medium", "none", "todo", null], ["Set up the project CI", 0, null, "none", "none", "doing", null],
    ] as [string, number | null, number | null, Priority, Repeat, Status, string | null][],
    subtasks: ["Check the receipts", "Attach the invoices", "Send to the coordinator"],
    notes: "The receipts are in the finance shared folder.",
    done: ["Close the weekly cash report", "Call the accountant", "Review the budget", "Send the monthly report", "Update the goals sheet", "Book the dentist", "Reply to Rita", "Study CSS Grid"],
    habits: [["Read 20 minutes", "daily"], ["Workout", "weekdays"], ["Drink 2 liters of water", "daily"]] as [string, Habit["schedule"]][],
  },
};

function pairs(from: Lang, to: Lang): Map<string, string> {
  const a = TEXT[from], b = TEXT[to];
  const out = new Map<string, string>();
  const add = (x: string[], y: string[]) => x.forEach((v, i) => out.set(v, y[i]));
  add(a.projects, b.projects);
  add(a.tasks.map((t) => t[0]), b.tasks.map((t) => t[0]));
  add(a.subtasks, b.subtasks);
  add(a.done, b.done);
  add(a.habits.map((h) => h[0]), b.habits.map((h) => h[0]));
  out.set(a.notes, b.notes);
  return out;
}

export function translateDemo(state: State, from: Lang, to: Lang): State {
  if (from === to) return state;
  const map = pairs(from, to);
  const tr = (s: string) => map.get(s) ?? s;
  return {
    ...state,
    projects: state.projects.map((p) => ({ ...p, name: tr(p.name) })),
    habits: state.habits.map((h) => ({ ...h, name: tr(h.name) })),
    tasks: state.tasks.map((t) => ({ ...t, title: tr(t.title), notes: tr(t.notes), subtasks: t.subtasks.map((x) => ({ ...x, title: tr(x.title) })) })),
  };
}
