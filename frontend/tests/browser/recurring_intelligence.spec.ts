import { expect, test } from "@playwright/test";

const dates = ["2021-12-05", "2022-01-05", "2022-02-05"];
const history = dates.map((date, index) => ({
  id: `recurring-${index}`,
  date: `${date}T00:00:00Z`,
  payee: "Netflix",
  beginLine: index * 4 + 1,
  endLine: index * 4 + 3,
  fileName: "main.ledger",
  postings: [
    { account: "Expenses:Entertainment", quantity: index === 2 ? 649 : 499 },
    { account: "Assets:Bank", quantity: index === 2 ? -649 : -499 },
  ].map((p) => ({
    ...p,
    commodity: "INR",
    amount: p.quantity,
    date: `${date}T00:00:00Z`,
    payee: "Netflix",
    tag_recurring: "",
    transaction_begin_line: index * 4 + 1,
    transaction_end_line: index * 4 + 3,
    file_name: "main.ledger",
  })),
}));
const journal = history.map((t) =>
  `${t.date.slice(0, 10)} Netflix\n    Expenses:Entertainment  ${
    t.postings[0].quantity
  } INR\n    Assets:Bank\n`
).join("\n");

for (const width of [390, 768, 1440]) {
  test(`recurring suggestions are usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route(
      "**/api/recurring",
      (route) => route.fulfill({ json: { transaction_sequences: [] } }),
    );
    await page.route(
      "**/api/transaction",
      (route) => route.fulfill({ json: { transactions: history } }),
    );
    await page.goto("/cash_flow/recurring");
    await expect(
      page.getByRole("button", { name: "Confirm Netflix recurring" }),
    ).toBeVisible();
    await expect(
      page.getByText("Amount increased from 499 INR to 649 INR", {
        exact: false,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(() =>
        document.documentElement.scrollWidth <= globalThis.innerWidth
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Mark Netflix not recurring" })
      .click();
    await expect(page.getByText("No new recurring patterns found."))
      .toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Confirm Netflix recurring" }),
    ).toBeVisible();
  });
}

test("recurring confirmation uses editor persistence and survives page reload", async ({ page }) => {
  let confirmed = false;
  let savedContent = "";
  await page.route(
    "**/api/recurring",
    (route) =>
      route.fulfill({
        json: {
          transaction_sequences: confirmed
            ? [{
              key: "netflix",
              period: "",
              interval: 31,
              transactions: history,
            }]
            : [],
        },
      }),
  );
  await page.route(
    "**/api/transaction",
    (route) => route.fulfill({ json: { transactions: history } }),
  );
  await page.route(
    "**/api/editor/files",
    (route) =>
      route.fulfill({
        json: { files: [{ name: "main.ledger", content: journal }] },
      }),
  );
  await page.route(
    "**/api/editor/validate",
    (route) => route.fulfill({ json: { errors: [] } }),
  );
  await page.route("**/api/editor/save", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.expected_content).toBe(journal);
    savedContent = body.content;
    confirmed = true;
    await route.fulfill({ json: { saved: true, synced: true } });
  });
  await page.goto("/cash_flow/recurring");
  await page.getByRole("button", { name: "Confirm Netflix recurring" }).click();
  await expect(page.getByRole("status")).toContainText("Recurring tags saved");
  expect(savedContent.match(/Recurring:/g)).toHaveLength(3);
  await expect(page.getByRole("button", { name: "Confirm Netflix recurring" }))
    .toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Confirm Netflix recurring" }))
    .toHaveCount(0);
  await expect(page.getByTestId("recurring-intelligence-summary"))
    .toContainText("649 INR");
});
