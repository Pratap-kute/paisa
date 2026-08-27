import type dayjs from "dayjs";
export interface Log {
  time: dayjs.Dayjs;
  level: string;
  msg: string;
}
