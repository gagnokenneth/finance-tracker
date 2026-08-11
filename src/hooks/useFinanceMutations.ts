import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getApi } from '../api/index.ts'
import { financeKey } from './useFinanceData.ts'
import { useAuth } from '../auth/useAuth.ts'
import { useToast } from './useToast.ts'
import { writeCachedCurrency } from '../lib/currency.ts'
import {
  addBillTo,
  addDebtTo,
  addScheduleRowTo,
  addStatementTo,
  applyBillPatch,
  applyBillPayablePatch,
  applyScheduleRowPatch,
  applyStatementPatch,
  closeBillIn,
  payBillPayableIn,
  removeBill,
  removeBillPayable,
  removeDebt,
  removeScheduleRow,
  removeStatement,
  renameDebt,
} from '../lib/optimistic.ts'
import type { Currency, FinanceData } from '../types.ts'
import type {
  NewFund,
  NewBill,
  BillPatch,
  BillPayablePatch,
  PayBillInput,
  NewExpendable,
  NewDebt,
  NewScheduleRow,
  NewStatement,
  ScheduleRowPatch,
  StatementPatch,
  NewSavings,
  NewSavingsTransfer,
} from '../api/FinanceApi.ts'

export function useFinanceMutations() {
  const qc = useQueryClient()
  const userId = useAuth().user?.id
  const showError = useToast()
  const onSuccess = () => {
    void qc.invalidateQueries({ queryKey: financeKey })
  }

  const addFund = useMutation({ mutationFn: (i: NewFund) => getApi().addFund(i), onSuccess })
  const addExpendable = useMutation({
    mutationFn: (i: NewExpendable) => getApi().addExpendable(i),
    onSuccess,
  })
  const setMonthlyBudget = useMutation({
    mutationFn: (v: { month: string; amount: number }) =>
      getApi().setMonthlyBudget(v.month, v.amount),
    onSuccess,
  })

  /*
   * Debt and currency writes return the whole updated dataset, so the response
   * goes straight into the cache. No invalidate, which means no second request
   * and no window where a follow-up read could observe pre-write state.
   */
  const applyData = (data: FinanceData) => {
    qc.setQueryData(financeKey, data)
  }

  /**
   * Shared wiring for a write whose result the client can predict: patch the
   * cache now, keep a snapshot, and put the snapshot back if the write is
   * rejected. The modal is already gone by then, so the failure has to be
   * announced — silently reverting would read as the change never happening.
   *
   * onSuccess still overwrites with the backend's own copy, so a prediction
   * that was subtly wrong is corrected rather than left to accumulate.
   */
  const optimistic = <TVars,>(
    predict: (data: FinanceData, vars: TVars) => FinanceData,
    /** null only where the caller shows its own error — never by omission. */
    failure: string | null,
  ) => ({
    onMutate: async (vars: TVars) => {
      // A read already in flight would otherwise land after the patch and
      // overwrite it with pre-write state.
      await qc.cancelQueries({ queryKey: financeKey })
      const previous = qc.getQueryData<FinanceData>(financeKey)
      if (previous) qc.setQueryData(financeKey, predict(previous, vars))
      return { previous }
    },
    onError: (_error: unknown, _vars: TVars, context: { previous?: FinanceData } | undefined) => {
      if (context?.previous) qc.setQueryData(financeKey, context.previous)
      if (failure) showError(failure)
      /*
       * The snapshot is a guess, not the truth. The write may have reached the
       * sheet before the client gave up on it, and restoring a whole-dataset
       * snapshot also discards any other write that landed while this one was
       * in flight. Nothing else would correct either: focus refetching is off
       * and data stays fresh for minutes.
       */
      void qc.invalidateQueries({ queryKey: financeKey })
    },
    /*
     * Only the last write standing applies the server's copy. An earlier
     * response cannot contain a write that is still in flight, so applying it
     * would blank that write's predicted row until its own response arrived.
     * Predictions stay authoritative for the length of a burst; the final
     * response reconciles all of them at once.
     *
     * <= 1 rather than === 0: the mutation running this handler is still counted.
     */
    onSuccess: (data: FinanceData) => {
      if (qc.isMutating() <= 1) applyData(data)
    },
  })

  const addDebt = useMutation({
    mutationFn: (i: NewDebt) => getApi().addDebt(i),
    ...optimistic(addDebtTo, 'That debt did not save. It has been removed.'),
  })
  const updateDebt = useMutation({
    mutationFn: (v: { id: number; name: string }) => getApi().updateDebt(v.id, { name: v.name }),
    ...optimistic(renameDebt, 'That rename did not save. The old name is back.'),
  })
  const deleteDebt = useMutation({
    mutationFn: (id: number) => getApi().deleteDebt(id),
    ...optimistic(removeDebt, 'That debt could not be deleted. It has been restored.'),
  })

  const addScheduleRow = useMutation({
    mutationFn: (v: { debtId: number; input: NewScheduleRow }) =>
      getApi().addScheduleRow(v.debtId, v.input),
    ...optimistic(addScheduleRowTo, 'That payment did not save. It has been removed.'),
  })
  const updateScheduleRow = useMutation({
    mutationFn: (v: { id: number; patch: ScheduleRowPatch }) =>
      getApi().updateScheduleRow(v.id, v.patch),
    ...optimistic(applyScheduleRowPatch, 'That installment did not save. The row is back as it was.'),
  })
  const deleteScheduleRow = useMutation({
    mutationFn: (id: number) => getApi().deleteScheduleRow(id),
    ...optimistic(removeScheduleRow, 'That installment could not be deleted. It has been restored.'),
  })

  // The caller writes the message: the pay flow and the recovery button each
  // failed at something different, and say so — see DebtDetail.
  const addStatement = useMutation({
    mutationFn: (v: { debtId: number; input: NewStatement }) =>
      getApi().addStatement(v.debtId, v.input),
    ...optimistic(addStatementTo, null),
  })
  const updateStatement = useMutation({
    mutationFn: (v: { id: number; patch: StatementPatch }) =>
      getApi().updateStatement(v.id, v.patch),
    ...optimistic(applyStatementPatch, 'That statement did not save. The row is back as it was.'),
  })
  const deleteStatement = useMutation({
    mutationFn: (id: number) => getApi().deleteStatement(id),
    ...optimistic(removeStatement, 'That statement could not be deleted. It has been restored.'),
  })

  const addBill = useMutation({
    mutationFn: (i: NewBill) => getApi().addBill(i),
    ...optimistic(addBillTo, 'That bill did not save. It has been removed.'),
  })
  const updateBill = useMutation({
    mutationFn: (v: { id: number; patch: BillPatch }) => getApi().updateBill(v.id, v.patch),
    ...optimistic(applyBillPatch, 'That bill did not save. It is back as it was.'),
  })
  const closeBill = useMutation({
    mutationFn: (id: number) => getApi().closeBill(id),
    ...optimistic(closeBillIn, 'That bill could not be closed. It has been reopened.'),
  })
  const deleteBill = useMutation({
    mutationFn: (id: number) => getApi().deleteBill(id),
    ...optimistic(removeBill, 'That bill could not be deleted. It has been restored.'),
  })

  const updateBillPayable = useMutation({
    mutationFn: (v: { id: number; patch: BillPayablePatch }) =>
      getApi().updateBillPayable(v.id, v.patch),
    ...optimistic(applyBillPayablePatch, 'That payable did not save. The row is back as it was.'),
  })
  const deleteBillPayable = useMutation({
    mutationFn: (id: number) => getApi().deleteBillPayable(id),
    ...optimistic(removeBillPayable, 'That payable could not be deleted. It has been restored.'),
  })
  const payBillPayable = useMutation({
    mutationFn: (v: { id: number; input: PayBillInput }) => getApi().payBillPayable(v.id, v.input),
    ...optimistic(payBillPayableIn, 'That payment did not save. The payable is unpaid again.'),
  })

  const setCurrency = useMutation({
    mutationFn: (c: Currency) => getApi().setCurrency(c),
    // Settings renders its own failure line, so this one stays off the toasts.
    ...optimistic(
      (data, c: Currency) => ({ ...data, settings: { ...data.settings, currency: c } }),
      null,
    ),
    onSuccess: (data, c) => {
      // Also refresh the cache that gives the right symbol on first paint.
      if (userId !== undefined) writeCachedCurrency(userId, c)
      // Overriding the helper's onSuccess means repeating its guard — see there.
      if (qc.isMutating() <= 1) applyData(data)
    },
  })

  const addSavings = useMutation({
    mutationFn: (i: NewSavings) => getApi().addSavings(i),
    onSuccess,
  })
  const transferSavings = useMutation({
    mutationFn: (i: NewSavingsTransfer) => getApi().transferSavingsToFunds(i),
    onSuccess,
  })

  return {
    addFund,
    addExpendable,
    setMonthlyBudget,
    addDebt,
    updateDebt,
    deleteDebt,
    addScheduleRow,
    updateScheduleRow,
    deleteScheduleRow,
    addStatement,
    updateStatement,
    deleteStatement,
    addBill,
    updateBill,
    closeBill,
    deleteBill,
    updateBillPayable,
    deleteBillPayable,
    payBillPayable,
    setCurrency,
    addSavings,
    transferSavings,
  }
}
