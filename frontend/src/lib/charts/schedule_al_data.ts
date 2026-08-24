import type { ScheduleALEntry } from "$lib/core/utils";

export function scheduleALTotal(entries: ScheduleALEntry[]): number {
  return entries.reduce((total, entry) => total + entry.amount, 0);
}
