import dayjs from "dayjs";
export function configUpdated() {
  dayjs.locale("en");
  dayjs.updateLocale("en", {
    weekStart: USER_CONFIG.week_starting_day,
  });
}
