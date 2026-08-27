import type { ScheduleALEntry } from "$lib/domain/tax";

export function scheduleALTotal(entries: ScheduleALEntry[]): number {
  return entries.reduce((total, entry) => total + entry.amount, 0);
}
