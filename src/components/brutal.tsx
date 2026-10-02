import { Link } from 'react-router-dom'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { useEscape } from '../hooks/useEscape.ts'
import { LOOKS, LookContext, controlClass, useLook } from './brutalLook.tsx'
import type { LookName } from './brutalLook.tsx'

/*
 * The monochrome "architectural" controls from the UI revamp. Kept apart from
 * ui.tsx rather than restyling it in place: every page not yet redesigned
 * still renders the old controls, and migrates here one screen at a time.
 */

/** The design's one interactive gesture: a flat control inverts to solid
 *  black on hover. Shared by the nav, the calendar and every control here. */
export const invertOnHover = 'transition-colors hover:bg-black hover:text-white'

/** A small button's shape and type, without its colours. */
const smallButtonShape = 'border border-black font-mono text-[11px] font-bold uppercase'

/** Bordered mono text-button, unpadded — sized by its caller. */
export const smallButtonBase = `${smallButtonShape} bg-white ${invertOnHover}`

/** Small bordered mono action — "Move to…", a checklist item's Remove. */
export const smallButtonClass = `${smallButtonBase} px-2.5 py-1`

/** The solid black counterpart — a ledger row's Pay. */
export const smallPrimaryButtonClass = `${smallButtonShape} bg-black px-3 py-1 text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-200 disabled:text-neutral-500`

/** A clickable row's surface — a task card, a Backlog row, a note. */
export const cardClass =
  'border border-black bg-white shadow-hard-xs transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black'

/** A static bordered panel — a note's editor, its checklist. */
export const panelClass = 'border border-black bg-white shadow-hard-sm'

/** A migrated page's main title, and the smaller one a detail page uses. */
export const pageTitleClass = 'text-5xl font-bold tracking-tight text-black uppercase md:text-6xl'
export const detailTitleClass = 'text-4xl font-bold tracking-tight text-black uppercase md:text-5xl'
/** A record's name heading its own bordered summary panel (a debt). */
export const panelTitleClass = 'text-3xl font-bold tracking-tight text-black'

/** The box an inline rename swaps in for a title — sized by its text classes. */
export const inlineEditClass = 'rounded-none border border-black bg-white focus:outline-2 focus:-outline-offset-2 focus:outline-black'

export function BrutalModal({
  open,
  title,
  onClose,
  children,
  look = 'grid',
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  look?: LookName
}) {
  useEscape(open, onClose)

  if (!open) return null
  const ui = LOOKS[look]
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className={`relative max-h-[90vh] w-full overflow-y-auto border-black bg-white ${ui.panel}`}>
        <header className={`flex items-center justify-between gap-4 border-b border-black bg-white px-6 ${ui.header}`}>
          <div className="flex min-w-0 items-center gap-2">
            {ui.marker && <span aria-hidden className="size-2.5 shrink-0 bg-black" />}
            <h2 className={`truncate font-bold tracking-tight text-black uppercase ${ui.title}`}>{title}</h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className={`flex shrink-0 items-center gap-1 border border-black font-mono font-bold uppercase ${ui.close} ${invertOnHover}`}
          >
            <span>Esc</span>
            <span className={ui.closeGlyph}>×</span>
          </button>
        </header>
        <LookContext.Provider value={look}>{children}</LookContext.Provider>
      </div>
    </div>
  )
}

/** A modal's field area, padded for the modal's look. */
export function BrutalModalBody({ children }: { children: ReactNode }) {
  return <div className={useLook().body}>{children}</div>
}

/** A modal's ruled action row. `spread` pushes the first child (a Delete)
 *  to the far side from the rest. */
export function BrutalModalFooter({ spread, children }: { spread?: boolean; children: ReactNode }) {
  const ui = useLook()
  return (
    <div className={`flex items-center gap-3 border-black ${ui.footer} ${spread ? 'justify-between' : ui.footerAlign}`}>
      {children}
    </div>
  )
}

/** A bordered square icon action. */
const ICON_BUTTON_SIZE = {
  /** A page's own action — a detail page's Delete. Sizes its icon too. */
  md: 'size-10 shadow-hard-xs [&_svg]:size-4',
  /** A row's action inside a table — Edit / Delete. */
  sm: 'size-7',
}

export function BrutalIconButton({
  label,
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: keyof typeof ICON_BUTTON_SIZE }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      {...props}
      className={`flex shrink-0 items-center justify-center border border-black bg-white ${ICON_BUTTON_SIZE[size]} ${invertOnHover} ${className}`}
    >
      {children}
    </button>
  )
}

/**
 * A list row linking to its detail page. A pending row is not a link: its id
 * exists only in the cache, so the route would find nothing until the write
 * returns the real one.
 */
export function BrutalCardRow({
  to,
  pending,
  className = '',
  children,
}: {
  to: string
  pending: boolean
  className?: string
  children: ReactNode
}) {
  return pending ? (
    <div className={`${cardClass} ${className}`}>{children}</div>
  ) : (
    <Link to={to} className={`${cardClass} ${className}`}>
      {children}
    </Link>
  )
}

/** Square checkbox, filled solid black when checked. */
export const checkboxClass =
  'size-4 shrink-0 cursor-pointer appearance-none rounded-none border border-black bg-white checked:bg-black disabled:cursor-not-allowed disabled:opacity-50'

/** One segment of a stepper; the middle (label) segment shares its frame but
 *  drops the hover and keeps only its top and bottom rules. */
const stepFrame = 'flex h-10 items-center border-black bg-white font-mono text-xs font-bold'
const stepButtonClass = `${stepFrame} gap-1.5 border px-4 tracking-wider uppercase ${invertOnHover}`

/** ← PREV | label | NEXT → — the joined control that pages a period (the
 *  Tasks week, the Income month). `unit` names it for screen readers. */
export function BrutalStepper({
  label,
  unit,
  onPrev,
  onNext,
}: {
  label: ReactNode
  unit: string
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="flex items-center">
      <button type="button" aria-label={`Previous ${unit}`} className={stepButtonClass} onClick={onPrev}>
        ← Prev
      </button>
      <div className={`tnum ${stepFrame} justify-center border-y px-3 tracking-widest text-black uppercase sm:px-6`}>
        {label}
      </div>
      <button type="button" aria-label={`Next ${unit}`} className={stepButtonClass} onClick={onNext}>
        Next →
      </button>
    </div>
  )
}

/** A list page's header: big title, an optional summary line under it, its
 *  primary action, and the black rule beneath. */
export function BrutalPageHeader({ title, summary, action }: { title: string; summary?: ReactNode; action: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black pb-8">
      <div className="space-y-3">
        <h1 className={pageTitleClass}>{title}</h1>
        {summary && <p className="text-xl text-neutral-500">{summary}</p>}
      </div>
      {action}
    </div>
  )
}

/** A detail page's "← Debts"-style link back to its list. */
export function BrutalBackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-block font-mono text-sm text-black underline-offset-4 hover:underline">
      ← {children}
    </Link>
  )
}

/** A detail page whose record is gone (deleted elsewhere, a stale link). */
export function BrutalNotFound({ noun, to, listLabel }: { noun: string; to: string; listLabel: string }) {
  return (
    <p className="font-mono text-sm text-neutral-600">
      That {noun} no longer exists.{' '}
      <Link to={to} className="font-bold text-black underline underline-offset-2">
        Back to {listLabel}
      </Link>
    </p>
  )
}

/** A form's validation message, under its fields. */
export function BrutalFormError({ children }: { children: ReactNode }) {
  return <p className="font-mono text-xs font-bold text-black">{children}</p>
}

/** The bordered "nothing here yet" block a list shows when it's empty. */
export function BrutalEmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border border-black bg-white px-6 py-28 text-center md:py-36">
      <div aria-hidden className="mb-6 flex justify-center gap-[6px]">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className="h-0.5 w-3 bg-neutral-500" />
        ))}
      </div>
      <p className="text-sm font-bold tracking-wider text-black uppercase">{title}</p>
      <p className="mt-2 text-sm text-neutral-500">{children}</p>
    </div>
  )
}

/** The solid black square "+" that adds a task to a lane or the Backlog. */
export function BrutalAddButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      title="Add task"
      {...props}
      className={`flex items-center justify-center bg-black font-mono leading-none text-white hover:bg-neutral-800 ${className}`}
    >
      +
    </button>
  )
}

/** Mono uppercase caption — field labels, section headings. */
export const labelClass = 'font-mono text-xs font-bold tracking-wider text-black uppercase'

export function BrutalField({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string
  /** Omitted for a control that isn't a labelable element (the rich-text
   *  editor) — the label then just captions it. */
  htmlFor?: string
  required?: boolean
  children: ReactNode
}) {
  const ui = useLook()
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label htmlFor={htmlFor} className={`block ${labelClass}`}>
          {label}
          {required && <span className="font-extrabold"> *</span>}
        </label>
        {required && <span className="font-mono text-[10px] text-neutral-500 uppercase">{ui.requiredNote}</span>}
      </div>
      {children}
    </div>
  )
}

export function BrutalInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const ui = useLook()
  return <input {...props} className={`${controlClass} ${ui.input} ${className}`} />
}

/** A currency amount: non-negative, to the cent. Any prop can override. */
export function BrutalMoneyInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <BrutalInput type="number" step="0.01" min="0" {...props} />
}

export function BrutalSelect({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const ui = useLook()
  return (
    <div className="relative">
      <select
        {...props}
        className={`brutal-select ${controlClass} cursor-pointer appearance-none text-xs tracking-tight uppercase ${ui.select} ${className}`}
      >
        {children}
      </select>
      {ui.caret}
    </div>
  )
}

/** A disabled button fades and stops reacting to hover, so it can't pass for
 *  a live one. */
const buttonBase =
  'flex items-center justify-center gap-1.5 border border-black font-mono text-xs font-bold uppercase transition-colors disabled:pointer-events-none disabled:opacity-50'

export function BrutalButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const ui = useLook()
  return (
    <button
      {...props}
      className={`${buttonBase} ${ui.primary} bg-black text-white hover:bg-neutral-800 active:bg-neutral-900 ${className}`}
    />
  )
}

export function BrutalSecondaryButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const ui = useLook()
  return <button {...props} className={`${buttonBase} ${ui.secondary} text-black ${invertOnHover} ${className}`} />
}

/** A yes/no question in the plain frame — deletes and the like. */
export function BrutalConfirm({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <BrutalModal open={open} title={title} onClose={onClose} look="plain">
      <BrutalModalBody>
        <p className="font-mono text-sm text-black">{message}</p>
      </BrutalModalBody>
      <BrutalModalFooter>
        <BrutalSecondaryButton type="button" onClick={onClose}>
          Cancel
        </BrutalSecondaryButton>
        <BrutalButton type="button" onClick={onConfirm}>
          {confirmLabel}
        </BrutalButton>
      </BrutalModalFooter>
    </BrutalModal>
  )
}
