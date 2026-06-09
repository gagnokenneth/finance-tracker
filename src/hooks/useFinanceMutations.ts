import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getApi } from '../api/index.ts'
import { financeKey } from './useFinanceData.ts'
import type {
  NewFund,
  NewBill,
  NewExpendable,
  NewDebt,
  NewDebtPayment,
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
  const payDebt = useMutation({
    mutationFn: (i: NewDebtPayment) => getApi().payDebt(i),
    onSuccess,
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
    payDebt,
    addSavings,
    transferSavings,
  }
}
