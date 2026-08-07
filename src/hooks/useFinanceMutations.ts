import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getApi } from '../api/index.ts'
import { financeKey } from './useFinanceData.ts'
import { writeCachedCurrency } from '../lib/currency.ts'
import type { Currency } from '../types.ts'
import type {
  NewFund,
  NewBill,
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
  const onSuccess = () => {
    void qc.invalidateQueries({ queryKey: financeKey })
  }

  const addFund = useMutation({ mutationFn: (i: NewFund) => getApi().addFund(i), onSuccess })
  const addBill = useMutation({ mutationFn: (i: NewBill) => getApi().addBill(i), onSuccess })
  const setBillPaid = useMutation({
    mutationFn: (v: { id: number; paid: boolean }) => getApi().setBillPaid(v.id, v.paid),
    onSuccess,
  })
  const addExpendable = useMutation({
    mutationFn: (i: NewExpendable) => getApi().addExpendable(i),
    onSuccess,
  })
  const setMonthlyBudget = useMutation({
    mutationFn: (v: { month: string; amount: number }) =>
      getApi().setMonthlyBudget(v.month, v.amount),
    onSuccess,
  })

  const addDebt = useMutation({ mutationFn: (i: NewDebt) => getApi().addDebt(i), onSuccess })
  const updateDebt = useMutation({
    mutationFn: (v: { id: number; name: string }) => getApi().updateDebt(v.id, { name: v.name }),
    onSuccess,
  })
  const deleteDebt = useMutation({
    mutationFn: (id: number) => getApi().deleteDebt(id),
    onSuccess,
  })

  const addScheduleRow = useMutation({
    mutationFn: (v: { debtId: number; input: NewScheduleRow }) =>
      getApi().addScheduleRow(v.debtId, v.input),
    onSuccess,
  })
  const updateScheduleRow = useMutation({
    mutationFn: (v: { id: number; patch: ScheduleRowPatch }) =>
      getApi().updateScheduleRow(v.id, v.patch),
    onSuccess,
  })
  const deleteScheduleRow = useMutation({
    mutationFn: (id: number) => getApi().deleteScheduleRow(id),
    onSuccess,
  })

  const addStatement = useMutation({
    mutationFn: (v: { debtId: number; input: NewStatement }) =>
      getApi().addStatement(v.debtId, v.input),
    onSuccess,
  })
  const updateStatement = useMutation({
    mutationFn: (v: { id: number; patch: StatementPatch }) =>
      getApi().updateStatement(v.id, v.patch),
    onSuccess,
  })
  const deleteStatement = useMutation({
    mutationFn: (id: number) => getApi().deleteStatement(id),
    onSuccess,
  })

  // Needs its own onSuccess: it also refreshes the localStorage cache that
  // keeps the right symbol on first paint. The second argument is the value
  // that was passed to mutate().
  const setCurrency = useMutation({
    mutationFn: (c: Currency) => getApi().setCurrency(c),
    onSuccess: (_data, c) => {
      writeCachedCurrency(c)
      void qc.invalidateQueries({ queryKey: financeKey })
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
    addBill,
    setBillPaid,
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
    setCurrency,
    addSavings,
    transferSavings,
  }
}
