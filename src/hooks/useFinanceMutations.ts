import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getApi } from '../api/index.ts'
import { financeKey } from './useFinanceData.ts'
import { useAuth } from '../auth/useAuth.ts'
import { useToast } from './useToast.ts'
import { writeCachedCurrency } from '../lib/currency.ts'
import { errorDetail } from '../lib/errorText.ts'
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
  addIncomeTo,
  applyIncomePatch,
  removeIncome,
  addIncomeSourceTo,
  applyIncomeSourcePatch,
  removeIncomeSource,
  addSavingsEntryTo,
  applySavingsEntryPatch,
  removeSavingsEntry,
} from '../lib/optimistic.ts'
import type { Currency, FinanceData } from '../types.ts'
import type {
  NewBill,
  BillPatch,
  BillPayablePatch,
  PayBillInput,
  NewDebt,
  NewScheduleRow,
  NewStatement,
  ScheduleRowPatch,
  StatementPatch,
  NewIncome,
  IncomePatch,
  NewIncomeSource,
  IncomeSourcePatch,
  NewSavingsEntry,
  SavingsEntryPatch,
} from '../api/FinanceApi.ts'

export function useFinanceMutations() {
  const qc = useQueryClient()
  const userId = useAuth().user?.id
  const showError = useToast()

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
    onError: (error: unknown, _vars: TVars, context: { previous?: FinanceData } | undefined) => {
      if (context?.previous) qc.setQueryData(financeKey, context.previous)
      // A refusal the user cannot act on is a weaker version of the same intent
      // as the fixed strings below: prefer the backend's own reason (e.g. the
      // savings guard naming the balance) when it carries one, and fall back to
      // the fixed copy only when errorDetail has nothing useful to add.
      const detail = errorDetail(error)
      if (detail) showError(detail)
      else if (failure) showError(failure)
      /*
       * The snapshot is a guess, not the truth. The write may have reached the
       * sheet before the client gave up on it, and restoring a whole-dataset
       * snapshot also discards any other write that landed while this one was
       * in flight. Nothing else would correct either: focus refetching is off
       * and data stays fresh for minutes.
       *
       * Skipped while another write is in flight, for the same reason onSuccess
       * is: the refetch it starts could land after that write's own response and
       * overwrite the cache with server state from before it. That write will
       * settle the cache itself when it answers.
       */
      if (qc.isMutating() <= 1) void qc.invalidateQueries({ queryKey: financeKey })
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

  /*
   * The message lives here rather than at the call sites. A mutate-level onError
   * only runs while its observer still has listeners, so a caller-supplied
   * message is lost if the user leaves the page while the write is in flight —
   * and against a backend that can take 45s, that is not a rare accident. The
   * wording covers both callers: whatever prompted it, the next statement is not
   * there and the button is how to get it.
   */
  const addStatement = useMutation({
    mutationFn: (v: { debtId: number; input: NewStatement }) =>
      getApi().addStatement(v.debtId, v.input),
    ...optimistic(
      addStatementTo,
      'The next statement was not created. Use Start next statement to try again.',
    ),
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

  const addIncome = useMutation({
    mutationFn: (i: NewIncome) => getApi().addIncome(i),
    ...optimistic(addIncomeTo, 'That income did not save. It has been removed.'),
  })
  const updateIncome = useMutation({
    mutationFn: (v: { id: number; patch: IncomePatch }) => getApi().updateIncome(v.id, v.patch),
    ...optimistic(applyIncomePatch, 'That change did not save. The entry is back as it was.'),
  })
  const deleteIncome = useMutation({
    mutationFn: (id: number) => getApi().deleteIncome(id),
    ...optimistic(removeIncome, 'That income could not be deleted. It has been restored.'),
  })

  const addIncomeSource = useMutation({
    mutationFn: (i: NewIncomeSource) => getApi().addIncomeSource(i),
    ...optimistic(addIncomeSourceTo, 'That source did not save. It has been removed.'),
  })
  const updateIncomeSource = useMutation({
    mutationFn: (v: { id: number; patch: IncomeSourcePatch }) =>
      getApi().updateIncomeSource(v.id, v.patch),
    ...optimistic(applyIncomeSourcePatch, 'That source did not save. It is back as it was.'),
  })
  const deleteIncomeSource = useMutation({
    mutationFn: (id: number) => getApi().deleteIncomeSource(id),
    ...optimistic(removeIncomeSource, 'That source could not be deleted. It has been restored.'),
  })

  const addSavingsEntry = useMutation({
    mutationFn: (i: NewSavingsEntry) => getApi().addSavingsEntry(i),
    ...optimistic(addSavingsEntryTo, 'That movement did not save. It has been removed.'),
  })
  const updateSavingsEntry = useMutation({
    mutationFn: (v: { id: number; patch: SavingsEntryPatch }) =>
      getApi().updateSavingsEntry(v.id, v.patch),
    ...optimistic(applySavingsEntryPatch, 'That change did not save. The movement is back as it was.'),
  })
  const deleteSavingsEntry = useMutation({
    mutationFn: (id: number) => getApi().deleteSavingsEntry(id),
    ...optimistic(removeSavingsEntry, 'That movement could not be deleted. It has been restored.'),
  })

  return {
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
    addIncome,
    updateIncome,
    deleteIncome,
    addIncomeSource,
    updateIncomeSource,
    deleteIncomeSource,
    addSavingsEntry,
    updateSavingsEntry,
    deleteSavingsEntry,
  }
}
