import { cleanup, render } from "@testing-library/svelte";
import { afterEach, beforeEach, expect, test } from "vitest";
import DiagnosisStatusBanner from "./DiagnosisStatusBanner.svelte";
import QualityIssueRow from "./QualityIssueRow.svelte";
import HealthyChecksList from "./HealthyChecksList.svelte";
import type { DiagnosticCheck, QualityIssue } from "$lib/features/diagnosis/types";
import { obscure } from "$lib/shared/state/persisted";

afterEach(() => cleanup());

beforeEach(() => {
  obscure.set(false);
});

test("DiagnosisStatusBanner renders Healthy on clean checks", () => {
  const view = render(DiagnosisStatusBanner, {
    dangerCount: 0,
    warningCount: 0,
    infoCount: 0,
    totalIssues: 0,
    passedChecks: 11,
    totalChecks: 11,
    loading: false,
  });

  expect(view.getByText("All Systems Operational")).toBeTruthy();
  expect(view.getByText("Healthy")).toBeTruthy();
});

test("DiagnosisStatusBanner renders Attention Required on danger issues", () => {
  const view = render(DiagnosisStatusBanner, {
    dangerCount: 2,
    warningCount: 1,
    infoCount: 0,
    totalIssues: 3,
    passedChecks: 9,
    totalChecks: 11,
    loading: false,
  });

  expect(view.getByText(/potential issue\(s\) found/i)).toBeTruthy();
  expect(view.getByText("Attention Required")).toBeTruthy();
});

test("DiagnosisStatusBanner renders Needs Review on warning-only issues", () => {
  const view = render(DiagnosisStatusBanner, {
    dangerCount: 0,
    warningCount: 2,
    infoCount: 1,
    totalIssues: 3,
    passedChecks: 9,
    totalChecks: 11,
    loading: false,
  });

  expect(view.getByText(/No blocking issues/i)).toBeTruthy();
  expect(view.getByText("Needs Review")).toBeTruthy();
  expect(view.getByText(/2 need review · 1 informational/i)).toBeTruthy();
});

test("DiagnosisStatusBanner renders Operational on info-only issues", () => {
  const view = render(DiagnosisStatusBanner, {
    dangerCount: 0,
    warningCount: 0,
    infoCount: 2,
    totalIssues: 2,
    passedChecks: 11,
    totalChecks: 11,
    loading: false,
  });

  expect(view.getByText("All critical checks passed")).toBeTruthy();
  expect(view.getByText("Operational")).toBeTruthy();
  expect(view.getByText(/2 informational notes available below/i)).toBeTruthy();
});

test("QualityIssueRow renders issue details, entity, action, and affected features", () => {
  const issue: QualityIssue = {
    code: "valuation_fallback",
    level: "warning",
    category: "valuation",
    summary: "NIFTYBEES valuation fallback",
    description: "Paisa could not obtain a market valuation on Current FY opening.",
    details: "Valuation fell back to acquisition cost 250.50 INR on 2026-04-01.",
    entity: {
      type: "commodity",
      id: "NIFTYBEES",
      label: "NIFTYBEES",
    },
    affectedFeatures: ["Investment Performance", "Net Worth"],
    action: {
      label: "Review Prices",
      href: "/ledger/price",
    },
  };

  const view = render(QualityIssueRow, { issue });

  expect(view.getByText("NIFTYBEES valuation fallback")).toBeTruthy();
  expect(view.getByText("Valuation")).toBeTruthy();
  expect(view.getByText("Warning")).toBeTruthy();
  expect(view.getByText("NIFTYBEES")).toBeTruthy();
  expect(view.getByText(/Paisa could not obtain a market valuation/i)).toBeTruthy();
  expect(view.getByText(/Investment Performance/i)).toBeTruthy();
  expect(view.getByText(/Net Worth/i)).toBeTruthy();

  const actionLink = view.getByTestId("issue-action-button");
  expect(actionLink.getAttribute("href")).toBe("/ledger/price");
  expect(actionLink.textContent).toContain("Review Prices");
});

test("QualityIssueRow masks numerical amounts when privacy mode is active", () => {
  const issue: QualityIssue = {
    code: "negative_asset_balance",
    level: "danger",
    category: "ledger",
    summary: "Negative Asset Balance",
    description: "Account balance is negative.",
    details: "Assets:Checking went negative (-500.00) on 01 Jan 2026",
    entity: {
      type: "account",
      id: "Assets:Checking",
      label: "Assets:Checking",
    },
  };

  obscure.set(true);
  const view = render(QualityIssueRow, { issue });

  expect(view.container.textContent).not.toContain("-500.00");
  expect(view.container.textContent).toContain("****");
});

test("HealthyChecksList renders passed checks and flags engine execution failures", () => {
  const checks: DiagnosticCheck[] = [
    {
      code: "asset_balance_integrity",
      name: "Asset balance integrity",
      category: "ledger",
      status: "passed",
      issueCount: 0,
    },
    {
      code: "posting_direction",
      name: "Posting direction",
      category: "ledger",
      status: "passed",
      issueCount: 0,
    },
    {
      code: "broken_check",
      name: "Broken engine check",
      category: "valuation",
      status: "failed",
      issueCount: 0,
    },
  ];

  const view = render(HealthyChecksList, { checks });

  expect(view.getByText("Asset balance integrity")).toBeTruthy();
  expect(view.getByText("Posting direction")).toBeTruthy();
  expect(view.getByText(/1 check\(s\) could not execute/i)).toBeTruthy();
  expect(view.getByText(/Broken engine check/i)).toBeTruthy();
});
