import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import type { Posting, Transaction } from "../src/lib/domain/ledger.ts";
import { discoverRecurringCandidates } from "../src/lib/domain/recurring_analysis.ts";

dayjs.extend(isSameOrBefore);
dayjs.extend(utc);
dayjs.extend(timezone);

// Synthetic, deterministic workload: six months per merchant, two postings per transaction.
// Reports native runtime heap usage, not browser memory or network latency.
for (const postingCount of [5000, 25000, 50000]) {
  const transactions: Transaction[] = Array.from(
    { length: postingCount / 2 },
    (_, i) => {
      const merchant = String(Math.floor(i / 6)).split("").map((d) =>
        String.fromCharCode(97 + Number(d))
      ).join("");
      const date = dayjs("2026-04-08").add(i % 6, "month");
      return {
        id: String(i),
        date,
        payee: `Merchant ${merchant}`,
        fileName: "main.ledger",
        beginLine: i * 4 + 1,
        endLine: i * 4 + 3,
        postings: [
          { account: "Expenses:Services", quantity: 499 },
          { account: "Assets:Bank", quantity: -499 },
        ].map((p) => ({
          ...p,
          amount: p.quantity,
          commodity: "INR",
          date,
          payee: `Merchant ${merchant}`,
          tag_recurring: "",
          file_name: "main.ledger",
          transaction_begin_line: i * 4 + 1,
          transaction_end_line: i * 4 + 3,
        })) as Posting[],
      };
    },
  );
  const json = JSON.stringify({ transactions });
  const before = Deno.memoryUsage().heapUsed;
  const start = performance.now();
  const candidates = discoverRecurringCandidates(
    transactions,
    [],
    dayjs("2026-09-10"),
  );
  const duration = performance.now() - start;
  console.log(JSON.stringify({
    postings: postingCount,
    transactions: transactions.length,
    jsonBytes: new TextEncoder().encode(json).length,
    candidates: candidates.length,
    analysisMs: Math.round(duration),
    heapUsedMiB: Math.round(Deno.memoryUsage().heapUsed / 1048576),
    heapGrowthMiB: Math.round((Deno.memoryUsage().heapUsed - before) / 1048576),
  }));
}
