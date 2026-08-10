import type {
  ReactNode,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  ButtonHTMLAttributes,
} from 'react'

export const inputClass =
  'w-full rounded-lg border border-edge bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none'

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs font-semibold tracking-wide text-ink-soft uppercase">{label}</span>
      {children}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, type, ...rest } = props
  // Dates and amounts are data, so they get the mono face like every other figure.
  const isFigure = type === 'number' || type === 'date'
  return (
    <input
      {...rest}
      type={type}
      className={`${inputClass} ${isFigure ? 'tnum font-mono' : ''} ${className ?? ''}`}
    />
  )
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props
  return (
    <select {...rest} className={`${inputClass} ${className ?? ''}`}>
      {children}
    </select>
  )
}

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, children, ...rest } = props
  return (
    <button
      {...rest}
      className={`rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50 ${focusRing} ${className ?? ''}`}
    >
      {children}
    </button>
  )
}

/** Neutral action — Cancel, and anything that isn't the primary submit. */
export function SecondaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, children, ...rest } = props
  return (
    <button
      {...rest}
      className={`rounded-lg border border-edge bg-white px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink disabled:opacity-50 ${focusRing} ${className ?? ''}`}
    >
      {children}
    </button>
  )
}

/** Destructive confirmation — the button that actually deletes. */
export function DangerButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, children, ...rest } = props
  return (
    <button
      {...rest}
      className={`rounded-lg bg-overdue px-3.5 py-2 text-sm font-medium text-white transition-colors hover:brightness-90 disabled:opacity-50 ${focusRing} ${className ?? ''}`}
    >
      {children}
    </button>
  )
}

/** Compact row-level action, used inside table cells. */
export function RowButton({
  tone = 'neutral',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'neutral' | 'primary' | 'danger' }) {
  const tones = {
    neutral: 'border-edge bg-white text-ink-soft hover:bg-paper hover:text-ink',
    primary: 'border-brand bg-brand text-white hover:bg-brand-dark',
    danger: 'border-edge bg-white text-overdue hover:bg-overdue-wash',
  }
  return (
    <button
      {...rest}
      className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${tones[tone]} ${focusRing} ${className ?? ''}`}
    >
      {children}
    </button>
  )
}
