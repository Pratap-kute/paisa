import type { TransactionSchedule } from "$lib/domain/recurring";
import { dueDateIcon } from "$lib/shared/ui/due_date";

export function scheduleIcon(schedule: TransactionSchedule) {
  return dueDateIcon(schedule.scheduled, schedule.actual);
}
