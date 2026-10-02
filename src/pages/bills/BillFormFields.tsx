import { FREQUENCIES, FREQUENCY_LABEL, MONTH_LABEL } from '../../lib/billSchedule.ts'
import { BrutalField, BrutalInput, BrutalMoneyInput, BrutalSelect } from '../../components/brutal.tsx'
import type { BillForm } from '../../hooks/useBillForm.ts'
import type { BillFrequency, BillType } from '../../types.ts'

/**
 * The name, type, amount and recurrence inputs, shared by the add and edit
 * dialogs. Only the fields the chosen frequency needs are shown: one day for
 * monthly and quarterly, two for bi-monthly, a month and a day for annually.
 */
export function BillFormFields({ form }: { form: BillForm }) {
  const day = { type: 'number', step: '1', min: '1', max: '31', required: true } as const
  return (
    <>
      <BrutalField label="Name" htmlFor="bill-name" required>
        <BrutalInput id="bill-name" autoFocus value={form.name} onChange={(e) => form.setName(e.target.value)} required />
      </BrutalField>
      <BrutalField label="Type" htmlFor="bill-type">
        <BrutalSelect id="bill-type" value={form.type} onChange={(e) => form.setType(e.target.value as BillType)}>
          <option value="fixed">Fixed — same amount every time</option>
          <option value="variable">Variable — amount set each time</option>
        </BrutalSelect>
      </BrutalField>
      <BrutalField label="Frequency" htmlFor="bill-frequency">
        <BrutalSelect
          id="bill-frequency"
          value={form.frequency}
          onChange={(e) => form.setFrequency(e.target.value as BillFrequency)}
        >
          {FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {FREQUENCY_LABEL[f]}
            </option>
          ))}
        </BrutalSelect>
      </BrutalField>

      {form.type === 'fixed' && (
        <BrutalField label="Amount" htmlFor="bill-amount" required>
          <BrutalMoneyInput id="bill-amount" value={form.amount} onChange={(e) => form.setAmount(e.target.value)} required />
        </BrutalField>
      )}

      {form.frequency === 'annually' && (
        <BrutalField label="Due month" htmlFor="bill-month">
          <BrutalSelect id="bill-month" value={form.month} onChange={(e) => form.setMonth(e.target.value)}>
            {MONTH_LABEL.map((label, i) => (
              <option key={label} value={i + 1}>
                {label}
              </option>
            ))}
          </BrutalSelect>
        </BrutalField>
      )}

      <BrutalField
        label={form.frequency === 'bimonthly' ? 'First due day' : 'Due day of the month'}
        htmlFor="bill-day"
        required
      >
        <BrutalInput id="bill-day" {...day} value={form.day} onChange={(e) => form.setDay(e.target.value)} />
      </BrutalField>

      {form.frequency === 'bimonthly' && (
        <BrutalField label="Second due day" htmlFor="bill-second-day" required>
          <BrutalInput
            id="bill-second-day"
            {...day}
            value={form.secondDay}
            onChange={(e) => form.setSecondDay(e.target.value)}
          />
        </BrutalField>
      )}
    </>
  )
}
