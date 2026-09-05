import {
  advanceOccurrence,
  inferCadence,
  type Rhythm,
} from "./recurring_analysis";
import { groupBy, partition } from "es-toolkit";
import type { Transaction } from "$lib/domain/ledger";
import type {
  TransactionSchedule,
  TransactionSequence,
} from "$lib/domain/recurring";
import { now, prefixMinutesSeconds } from "$lib/domain/time";
import { transactionTotal } from "$lib/domain/transactions";
import dayjs from "dayjs";
import { type CronExprs, parse } from "@datasert/cronjs-parser";
import { getFutureMatches } from "@datasert/cronjs-matcher";
import { sortBy } from "$lib/shared/utils/collection";

const end = now().add(36, "month");

function zip(
  schedules: dayjs.Dayjs[],
  transactions: Transaction[],
  key: string,
  amount: number,
) {
  let si = 0;
  let ti = 0;
  const transactionSchedules: TransactionSchedule[] = [];

  while (si < schedules.length) {
    const s1 = schedules[si];
    const s2 = schedules[si + 1];
    const t1 = transactions[ti];
    const t2 = transactions[ti + 1];

    if (!t1) {
      transactionSchedules.push({
        key,
        amount,
        scheduled: s1,
        actual: null,
        transaction: null,
      });
      si++;
      continue;
    }

    const t1s1diff = Math.abs(t1.date.diff(s1, "day"));
    let t1s2diff = Number.MAX_VALUE;
    if (s2) {
      t1s2diff = Math.abs(t1.date.diff(s2, "day"));
    }

    let t2s1diff = Number.MAX_VALUE;
    if (t2) {
      t2s1diff = Math.abs(t2.date.diff(s1, "day"));
    }

    if (t1s1diff > t2s1diff) {
      transactionSchedules.push({
        key,
        amount: transactionTotal(t1),
        scheduled: t1.date,
        actual: t1.date,
        transaction: t1,
      });
      ti++;
    } else if (t1s1diff > t1s2diff) {
      transactionSchedules.push({
        key,
        amount,
        scheduled: s1,
        actual: null,
        transaction: null,
      });
      si++;
    } else {
      transactionSchedules.push({
        key,
        amount: transactionTotal(t1),
        scheduled: s1,
        actual: t1.date,
        transaction: t1,
      });
      si++;
      ti++;
    }
  }

  return transactionSchedules;
}

function enrich(ts: TransactionSequence) {
  const transactions = ts.transactions.slice().reverse();
  const amount = ts.transactions.length ? totalRecurring(ts) : 0;
  const start = transactions[0]?.date ?? now();
  let periodAvailable = false;
  let cron: CronExprs | undefined;
  try {
    if (ts.period != "") {
      cron = parse(prefixMinutesSeconds(ts.period), { hasSeconds: false });
      const schedules = getFutureMatches(cron, {
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        matchCount: 1,
        timezone: dayjs.tz.guess(),
      });
      if (schedules && schedules.length > 0) {
        periodAvailable = true;
      }
    } else {
      periodAvailable = false;
    }
  } catch (_e) {
    periodAvailable = false;
  }

  if (periodAvailable && cron) {
    const schedules = getFutureMatches(cron, {
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      matchCount: 1000,
      timezone: dayjs.tz.guess(),
    });

    ts.schedules = zip(
      schedules.map((s) => dayjs(s)),
      transactions,
      ts.key,
      amount,
    );
  } else {
    const schedules: dayjs.Dayjs[] = transactions.map((t) => t.date);
    const rhythm = inferCadence(ts.transactions.map((t) => t.date));
    let next = schedules.at(-1);
    if (next && (rhythm.reliable || ts.interval > 0)) {
      do {
        next = nextDate(ts, next, rhythm);
        schedules.push(next);
      } while (schedules.length < 1000 && end.isAfter(next));
    }
    ts.schedules = zip(schedules, transactions, ts.key, amount);
  }

  const [past, future] = partition(
    ts.schedules,
    (s) => s.scheduled?.isBefore(now()) ?? false,
  );
  ts.pastSchedules = past;
  ts.futureSchedules = future;
  ts.schedulesByMonth = groupBy(
    ts.schedules,
    (s) => s.scheduled?.format("YYYY-MM") || "NA",
  );
  if (future[0]?.scheduled && past.at(-1)?.scheduled) {
    ts.interval = future[0].scheduled.diff(past.at(-1)!.scheduled, "day");
  }
  return ts;
}

export function nextUnpaidSchedule(ts: TransactionSequence) {
  const last = ts.pastSchedules?.at(-1);
  if (last && !last.actual) {
    return last;
  }
  return ts.futureSchedules?.find((s) => !s.actual);
}

export function intervalText(ts: TransactionSequence) {
  if (ts.interval >= 7 && ts.interval <= 8) {
    return "weekly";
  }

  if (ts.interval >= 14 && ts.interval <= 16) {
    return "bi-weekly";
  }

  if (ts.interval >= 28 && ts.interval <= 33) {
    return "monthly";
  }

  if (ts.interval >= 87 && ts.interval <= 100) {
    return "quarterly";
  }

  if (ts.interval >= 175 && ts.interval <= 190) {
    return "half-yearly";
  }

  if (ts.interval >= 350 && ts.interval <= 395) {
    return "yearly";
  }

  return `every ${ts.interval} days`;
}

function nextDate(ts: TransactionSequence, date: dayjs.Dayjs, rhythm: Rhythm) {
  if (rhythm.reliable) return advanceOccurrence(date, rhythm);
  return date.add(Math.max(1, ts.interval), "day");
}

export function totalRecurring(ts: TransactionSequence) {
  const lastTransaction = ts.transactions[0];
  return transactionTotal(lastTransaction);
}

export function enrichTrantionSequence(
  transactionSequences: TransactionSequence[],
) {
  return transactionSequences.map((ts) => enrich(ts));
}

export function sortTrantionSequence(
  transactionSequences: TransactionSequence[],
) {
  return sortBy(transactionSequences, (ts) => {
    const s = nextUnpaidSchedule(ts);
    return s?.scheduled
      ? Math.abs(s.scheduled.diff(now()))
      : Number.MAX_SAFE_INTEGER;
  });
}
