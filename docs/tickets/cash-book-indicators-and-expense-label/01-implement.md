# Ticket: Cash Book Expense Label & Saldo Up/Down Indicator

## Task
1. In `src/app/app/kas/buku/page.tsx`:
   - Import `ArrowUp` and `ArrowDown` from `lucide-react`.
   - Update line category rendering so that when `!isIn` (expense), category badge has `text-alert font-medium`.
   - In the saldo column (`<td>` containing `{rp(line.saldo)}`), render the up/down indicator before `rp(line.saldo)`:
     - `ArrowUp` (`h-3 w-3 text-forest shrink-0`, `strokeWidth={1.5}`) for `isIn`
     - `ArrowDown` (`h-3 w-3 text-alert shrink-0`, `strokeWidth={1.5}`) for `!isIn`
     - Group with `inline-flex items-center justify-end gap-1`
2. Simplify ledger table `<tfoot>`:
   - Change `colSpan={2}` to `colSpan={3}` for `{t("kas.totalRow")}`.
   - Remove the `totalIn` and `totalOut` column in `<tfoot>`.
   - Keep only `{rp(lastSaldo)}` in the final Saldo column.

## Verification
- Run `npm run typecheck`
- Run `npx vitest run`
