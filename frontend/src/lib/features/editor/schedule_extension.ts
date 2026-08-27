import dayjs from "dayjs";
import { parse } from "@datasert/cronjs-parser";
import { getFutureMatches } from "@datasert/cronjs-matcher";
import { MatchDecorator, WidgetType } from "@codemirror/view";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { prefixMinutesSeconds } from "$lib/domain/time";

class SchedulePreview extends WidgetType {
  constructor(readonly period: string) {
    super();
  }

  eq(other: SchedulePreview) {
    return this.period === other.period;
  }

  toDOM() {
    let text = "";
    try {
      const cron = parse(prefixMinutesSeconds(this.period), {
        hasSeconds: false,
      });
      const schedules = getFutureMatches(cron, {
        matchCount: 3,
        timezone: dayjs.tz.guess(),
      });
      text = schedules
        .map((schedule) => dayjs(schedule).format("DD MMM YYYY"))
        .join(", ");

      if (schedules.length === 0) {
        text = "Invalid";
      }
    } catch (_e) {
      text = "Invalid";
    }
    const wrapper = document.createElement("span");
    wrapper.innerHTML = text;
    wrapper.className = "cm-tag tag ml-2";
    return wrapper;
  }
}

const periodDecorator = new MatchDecorator({
  regexp: /;\s*Period: (([^ ]+ ){2,}[^ ]+)$/gi,
  decorate: (add, _from, to, match) => {
    const period = match[1];
    const start = to,
      end = to;
    const preview = new SchedulePreview(period);
    add(start, end, Decoration.widget({ widget: preview, side: 1 }));
  },
});

export const schedulePlugin = ViewPlugin.fromClass(
  class ScheduleView {
    decorator: MatchDecorator;
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorator = periodDecorator;
      this.decorations = this.decorator.createDeco(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.decorator.updateDeco(update, this.decorations);
      }
    }
  },
  { decorations: (v) => v.decorations },
);
