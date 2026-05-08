"use client";

import FinanceTotalSpentWidget from "@/app/(protected)/dashboard/components/finance/W_Finance_TotalSpent";
import FinanceOutstandingPayablesWidget from "@/app/(protected)/dashboard/components/finance/W_Finance_OutstandingPayables";
import FinanceCommittedSpentWidget from "@/app/(protected)/dashboard/components/finance/W_Finance_MedianPaymentDelay";
import FinanceRecentTransactionsWidget from "@/app/(protected)/dashboard/components/finance/W_Finance_RecentTransactions";
import FinanceSpendingByProjectWidget from "@/app/(protected)/dashboard/components/finance/W_Finance_SpendingByProject";
import FinanceTopVendorsBySpendWidget from "@/app/(protected)/dashboard/components/finance/W_Finance_TopVendorsBySpend";
import FinanceTopMaterialsBySpendWidget from "@/app/(protected)/dashboard/components/finance/W_Finance_TopMaterialsBySpend";

export default function FinancePage() {
  return (
    <div className="dashboard">
      <h1>FINANCIAL ANALYTICS</h1>

      <br />
      <br />

      <h2>Financial Overview</h2>
      <br />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1.2fr 2.2fr",
          gap: "16px",
          alignItems: "stretch",
        }}
      >
        <FinanceTotalSpentWidget />
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <FinanceOutstandingPayablesWidget />
          <FinanceCommittedSpentWidget />
        </div>
        <FinanceRecentTransactionsWidget />
      </div>

      <br />
      <br />
      <br />
      <FinanceSpendingByProjectWidget />

      <br />
      <br />
      <br />
      <FinanceTopVendorsBySpendWidget />

      <br />
      <br />
      <br />
      <FinanceTopMaterialsBySpendWidget />
    </div>
  );
}
