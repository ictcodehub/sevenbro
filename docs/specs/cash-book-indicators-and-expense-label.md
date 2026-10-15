# Spec: Cash Book Expense Label Color and Balance Up/Down Indicators

## 1. Background & Problem
- In Cash Book (`src/app/app/kas/buku/page.tsx`), transaction categories in the ledger table (tab Transactions) show "Refund" in orange (`text-amber-600`), but "Expense" remains in soft gray (`text-ink-soft/70`). Users requested "Expense" to be highlighted in red (`text-alert`).
- In the running balance column (`Saldo`), values are shown as plain `Rp. xxx.xxx` without visual indication of whether each row increased or decreased the balance.
- Users requested a clean, subtle up/down indicator right before the `Rp.` label in the Saldo column:
  - Up icon (`ArrowUp`) when balance increased (transaction `IN`), colored `text-forest`.
  - Down icon (`ArrowDown`) when balance decreased (transaction `OUT`), colored `text-alert`.
  - Simple stroke (`strokeWidth={1.5}` or `1.75`), not bold/thick.

## 2. Requirements & Acceptance Criteria
1. **Expense Category Label**:
   - In `kas/buku/page.tsx`, when row `kind === "OUT"` (Expense), the category label must be styled with `text-alert font-medium`.
   - Refund (`kind === "IN"` with refund category) continues to display in amber.
2. **Balance Up/Down Indicator**:
   - In the Saldo column of the ledger table (`kas/buku/page.tsx`), display an indicator directly in front of `Rp.`:
     - If `line.kind === "IN"`: `<ArrowUp className="h-3 w-3 text-forest shrink-0" strokeWidth={1.5} />`
     - If `line.kind === "OUT"`: `<ArrowDown className="h-3 w-3 text-alert shrink-0" strokeWidth={1.5} />`
   - Use an `inline-flex items-center justify-end gap-1` layout so the icon and `Rp. [amount]` are cleanly grouped and right-aligned.
3. **Simplified Table Footer**:
   - In `kas/buku/page.tsx` ledger table `<tfoot>`, remove the overcrowded `totalIn` and `totalOut` display in the third column (already displayed in the summary card at the top).
   - Use `colSpan={3}` for the `TOTAL` label, and display only the final balance (`{rp(lastSaldo)}`) in the fourth column (`Saldo`).
4. **Quality & Consistency**:
   - `npm run typecheck` and `npx vitest run` pass cleanly.
