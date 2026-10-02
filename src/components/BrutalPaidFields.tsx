import type { PaidFields } from '../hooks/usePaidFields.ts'
import { BrutalField, BrutalMoneyInput, checkboxClass, labelClass } from './brutal.tsx'
import { BrutalDatePicker } from './BrutalDatePicker.tsx'

/** The Paid checkbox, revealing the paid date and amount once checked. */
export function BrutalPaidFields({ fields, idPrefix }: { fields: PaidFields; idPrefix: string }) {
  return (
    <>
      <label className={`flex items-center gap-2.5 ${labelClass}`}>
        <input
          type="checkbox"
          className={checkboxClass}
          checked={fields.paid}
          onChange={(e) => fields.setPaid(e.target.checked)}
        />
        Paid
      </label>

      {fields.paid && (
        <>
          <BrutalField label="Paid date" htmlFor={`${idPrefix}-paid-date`} required>
            <BrutalDatePicker id={`${idPrefix}-paid-date`} value={fields.paidDate} onChange={fields.setPaidDate} />
          </BrutalField>
          <BrutalField label="Paid amount" htmlFor={`${idPrefix}-paid-amount`} required>
            <BrutalMoneyInput
              id={`${idPrefix}-paid-amount`}
              value={fields.paidAmount}
              onChange={(e) => fields.setPaidAmount(e.target.value)}
              required
            />
          </BrutalField>
        </>
      )}
    </>
  )
}
