import { usePayForm } from '../hooks/usePayForm.ts'
import type { PayResult } from '../hooks/usePayForm.ts'
import { Money } from './Money.tsx'
import {
  BrutalModal,
  BrutalField,
  BrutalMoneyInput,
  BrutalSelect,
  BrutalButton,
  BrutalSecondaryButton,
  BrutalModalBody,
  BrutalModalFooter,
} from './brutal.tsx'
import { BrutalDatePicker } from './BrutalDatePicker.tsx'

/** Records a payment against a debt row or a bill payable — see usePayForm. */
export function BrutalPayModal({
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
    <BrutalModal open={open} title="Record payment" onClose={onClose} look="plain">
      <form onSubmit={submit}>
        <BrutalModalBody>
          <BrutalField label="Payment date" htmlFor="pay-date" required>
            <BrutalDatePicker id="pay-date" value={date} onChange={setDate} />
          </BrutalField>
          <BrutalField label="Amount paid" htmlFor="pay-amount" required>
            {/* Savings requires a positive amount; the untracked source does not,
                and a variable payable or a statement can legitimately be 0. */}
            <BrutalMoneyInput
              id="pay-amount"
              min={fromSavings ? '0.01' : '0'}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </BrutalField>
          <BrutalField label="Paid from" htmlFor="pay-from">
            <BrutalSelect
              id="pay-from"
              value={fromSavings ? 'savings' : 'other'}
              onChange={(e) => setFromSavings(e.target.value === 'savings')}
            >
              <option value="other">Income or cash (not tracked)</option>
              <option value="savings">Savings</option>
            </BrutalSelect>
            {fromSavings && (
              <p className="mt-2 font-mono text-xs text-neutral-500">
                Savings balance <Money value={savingsBalance} />
              </p>
            )}
            {overdrawn && (
              <p className="mt-2 font-mono text-xs font-bold text-black">That is more than the savings balance.</p>
            )}
          </BrutalField>
        </BrutalModalBody>
        <BrutalModalFooter>
          <BrutalSecondaryButton type="button" onClick={onClose}>
            Cancel
          </BrutalSecondaryButton>
          <BrutalButton type="submit" disabled={overdrawn}>
            Record payment
          </BrutalButton>
        </BrutalModalFooter>
      </form>
    </BrutalModal>
  )
}
