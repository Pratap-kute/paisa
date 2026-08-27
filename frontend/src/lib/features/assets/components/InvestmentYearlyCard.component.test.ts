import { render, screen } from "@testing-library/svelte";
import { expect, test } from "vitest";
import InvestmentYearlyCard from "./InvestmentYearlyCard.svelte";
import dayjs from "dayjs";

test("renders investment yearly card with financial metrics", () => {
  const mockCard = {
    start_date: dayjs("2024-04-01"),
    end_date: dayjs("2025-03-31"),
    gross_salary_income: 1500000,
    gross_other_income: 50000,
    net_tax: 120000,
    net_income: 1430000,
    net_expense: 600000,
    net_investment: 830000,
    savings_rate: 58.04,
    postings: [],
  };

  const { container, unmount } = render(InvestmentYearlyCard, {
    card: mockCard,
  });

  expect(screen.getByText("2024 - 25")).toBeInTheDocument();
  expect(screen.getAllByText("58.04%").length).toBe(2);
  expect(screen.getByText("Gross Salary Income")).toBeInTheDocument();
  expect(screen.getByText("Investment")).toBeInTheDocument();

  const card = container.querySelector(".paisa-card");
  expect(card).toBeInTheDocument();

  unmount();
});
