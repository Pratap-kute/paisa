import type dayjs from "dayjs";
import { now } from "$lib/domain/time";
import { iconGlyph } from "$lib/shared/ui/icon";
export function dueDateIcon(
  dueDate: dayjs.Dayjs,
  clearedDate: dayjs.Dayjs,
  amountDue?: number,
) {
  let icon = "fa-circle-check";
  let glyph = iconGlyph("fa6-solid:circle-check");
  let color = "paisa-text-success";

  if (amountDue !== undefined && amountDue <= 0) {
    return { icon, color, glyph };
  }

  if (!clearedDate) {
    if (dueDate.isBefore(now(), "day")) {
      color = "paisa-text-danger";
      icon = "fa-exclamation-triangle";
      glyph = iconGlyph("fa6-solid:triangle-exclamation");
    } else {
      color = "paisa-text-muted";
    }
  } else {
    if (clearedDate.isSameOrBefore(dueDate, "day")) {
      color = "paisa-text-success";
    } else {
      color = "paisa-text-warning";
    }
  }

  return { icon, color, glyph };
}
