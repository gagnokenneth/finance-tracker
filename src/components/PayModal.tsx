import { usePayForm } from '../hooks/usePayForm.ts'
import type { PayResult } from '../hooks/usePayForm.ts'
import { Modal } from './Modal.tsx'
import { Money } from './Money.tsx'
import { Field, TextInput, SelectInput, Button, SecondaryButton } from './ui.tsx'

export function PayModal({
  open,
  defaultAmount,
  savingsBalance,
  onSubmit,
  onClose,
}: {
  open: boolean
  defaultAmount: number
  savingsBalance: number
  onSubmit: (result: PayResult) => void
  onClose: () => void
}) {
  const { date, setDate, amount, setAmount, fromSavings, setFromSavings, overdrawn, submit } = usePayForm(
    defaultAmount,
    savingsBalance,
    onSubmit,
  )

  return (
    <Modal open={open} title="Record payment" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Payment date" required>
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Amount paid" required>
          {/* Savings requires a positive amount; the untracked source does not,
              and a variable payable or a statement can legitimately be 0. */}
          <TextInput
            type="number"
            step="0.01"
            min={fromSavings ? '0.01' : '0'}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </Field>
        <Field label="Paid from">
          <SelectInput
            value={fromSavings ? 'savings' : 'other'}
            onChange={(e) => setFromSavings(e.target.value === 'savings')}
          >
            <option value="other">Income or cash (not tracked)</option>
            <option value="savings">Savings</option>
          </SelectInput>
          {fromSavings && (
            <p className="mt-1 text-xs text-ink-faint">
              Savings balance <Money value={savingsBalance} />
            </p>
          )}
          {overdrawn && (
            <p className="mt-1 text-xs text-overdue">
              That is more than the savings balance.
            </p>
          )}
        </Field>
        <div className="mt-1 flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <Button type="submit" disabled={overdrawn}>
            Record payment
          </Button>
        </div>
      </form>
    </Modal>
  )
}
