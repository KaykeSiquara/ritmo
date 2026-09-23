import { addDays, addMonths, isWeekend, type Day } from "./dates";
import type { Repeat } from "./types";

export function nextDue(due: Day, repeat: Repeat): Day {
  switch (repeat) {
    case "daily": return addDays(due, 1);
    case "weekly": return addDays(due, 7);
    case "monthly": return addMonths(due, 1);
    case "weekdays": {
      let d = addDays(due, 1);
      while (isWeekend(d)) d = addDays(d, 1);
      return d;
    }
    default: return due;
  }
}
