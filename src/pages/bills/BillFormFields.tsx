import { FREQUENCIES, FREQUENCY_LABEL, MONTH_LABEL } from '../../lib/billSchedule.ts'
import { Field, TextInput, SelectInput } from '../../components/ui.tsx'
import type { BillForm } from '../../hooks/useBillForm.ts'
import type { BillFrequency, BillType } from '../../types.ts'

/**
 * The name, type, amount and recurrence inputs, shared by the add and edit
 * dialogs. Only the fields the chosen frequency needs are shown: one day for
 * monthly and quarterly, two for bi-monthly, a month and a day for annually.
 */
export function BillFormFields({ form }: { form: BillForm }) {
  return (
    <>
      <Field label="Name" required>
        <TextInput value={form.name} onChange={(e) => form.setName(e.target.value)} required />
      </Field>
      <Field label="Type">
        <SelectInput
          value={form.type}
          onChange={(e) => form.setType(e.target.value as BillType)}
        >
          <option value="fixed">Fixed — same amount every time</option>
          <option value="variable">Variable — amount set each time</option>
        </SelectInput>
      </Field>
      <Field label="Frequency">
        <SelectInput
          value={form.frequency}
          onChange={(e) => form.setFrequency(e.target.value as BillFrequency)}
        >
          {FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {FREQUENCY_LABEL[f]}
            </option>
          ))}
        </SelectInput>
      </Field>

      {form.type === 'fixed' && (
        <Field label="Amount" required>
          <TextInput
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => form.setAmount(e.target.value)}
            required
          />
        </Field>
      )}

      {form.frequency === 'annually' && (
        <Field label="Due month">
          <SelectInput value={form.month} onChange={(e) => form.setMonth(e.target.value)}>
            {MONTH_LABEL.map((label, i) => (
              <option key={label} value={i + 1}>
                {label}
              </option>
            ))}
          </SelectInput>
        </Field>
      )}

      <Field
        label={form.frequency === 'bimonthly' ? 'First due day' : 'Due day of the month'}
        required
      >
        <TextInput
          type="number"
          step="1"
          min="1"
          max="31"
          value={form.day}
          onChange={(e) => form.setDay(e.target.value)}
          required
        />
      </Field>

      {form.frequency === 'bimonthly' && (
        <Field label="Second due day" required>
          <TextInput
            type="number"
            step="1"
            min="1"
            max="31"
            value={form.secondDay}
            onChange={(e) => form.setSecondDay(e.target.value)}
            required
          />
        </Field>
      )}
    </>
  )
}
