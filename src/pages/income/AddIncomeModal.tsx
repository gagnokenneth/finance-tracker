import { useFinanceMutations } from '../../hooks/useFinanceMutations.ts'
import { IncomeFormModal } from './IncomeFormModal.tsx'
import type { IncomeSource } from '../../types.ts'

export function AddIncomeModal({ sources, onClose }: { sources: IncomeSource[]; onClose: () => void }) {
  const { addIncome } = useFinanceMutations()
  return (
    <IncomeFormModal
      title="Add income"
      submitLabel="Add income"
      sources={sources}
      onSubmit={({ notes, ...values }) => {
        addIncome.mutate({ ...values, notes: notes || undefined })
        onClose()
      }}
      onClose={onClose}
    />
  )
}
