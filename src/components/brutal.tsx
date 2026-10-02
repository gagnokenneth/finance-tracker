import { createContext, useContext } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { useEscape } from '../hooks/useEscape.ts'

/*
 * The monochrome "architectural" controls from the UI revamp. Kept apart from
 * ui.tsx rather than restyling it in place: every page not yet redesigned
 * still renders the old controls, and migrates here one screen at a time.
 */

/** The design's one interactive gesture: a flat control inverts to solid
 *  black on hover. Shared by the nav, the calendar and every control here. */
export const invertOnHover = 'transition-colors hover:bg-black hover:text-white'

/** Bordered mono text-button, unpadded — sized by its caller. */
export const smallButtonBase = `border border-black bg-white font-mono text-[11px] font-bold uppercase ${invertOnHover}`

/** The Edit Task modal's "Move to…" actions. */
export const smallButtonClass = `${smallButtonBase} px-2.5 py-1`

/** A task's surface on the board — a lane card or a Backlog row. */
export const cardClass = 'border border-black bg-white shadow-hard-xs transition-colors hover:bg-neutral-50'

/**
 * The two looks the designs use, as one table so a look is changed in one
 * place: 'grid' (Add Task — hairline-gridded frame, grey fields with a hard
 * shadow, boxed ▼) and 'plain' (Edit Task — white and flat, a square marker
 * before the title, bare chevrons, shorter buttons). A modal sets the look
 * and every control inside it inherits it.
 */
const LOOKS = {
  grid: {
    panel:
      'max-w-xl border-2 bg-[length:16px_16px] bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] shadow-hard-lg',
    header: 'py-4',
    marker: false,
    title: 'text-2xl',
    close: 'h-8 px-3 text-xs tracking-wider',
    closeGlyph: 'text-base leading-none',
    requiredNote: 'Required field',
    input: 'h-11 bg-neutral-50 px-3 text-sm shadow-hard-xs placeholder:text-neutral-600',
    select: 'h-10 bg-neutral-50 pr-8 pl-3',
    caret: (
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center border-l border-black bg-neutral-200 px-2 text-black">
        <span className="font-mono text-[10px] font-bold">▼</span>
      </div>
    ),
    primary: 'h-11 flex-1 px-8 tracking-widest shadow-hard-muted sm:flex-initial',
    secondary: 'h-11 flex-1 bg-transparent px-6 tracking-wider sm:flex-initial',
  },
  plain: {
    panel: 'max-w-[620px] border shadow-hard-md',
    header: 'py-5',
    marker: true,
    title: 'text-xl',
    close: 'px-2 py-1 text-[11px]',
    closeGlyph: '',
    requiredNote: 'Required',
    input: 'bg-white px-3.5 py-2.5 text-sm',
    select: 'bg-white py-2.5 pr-8 pl-3.5',
    caret: (
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-black">
        <svg aria-hidden className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M19 9l-7 7-7-7" strokeLinecap="square" />
        </svg>
      </div>
    ),
    primary: 'px-5 py-2 tracking-wider',
    secondary: 'bg-white px-4 py-2 tracking-wider',
  },
}

type LookName = keyof typeof LOOKS

const LookContext = createContext<LookName>('grid')
const useLook = () => LOOKS[useContext(LookContext)]

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

const controlClass =
  'w-full rounded-none border border-black font-mono text-black transition-all focus:bg-white focus:outline-none'

export function BrutalInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const ui = useLook()
  return <input {...props} className={`${controlClass} ${ui.input} ${className}`} />
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

const buttonBase =
  'flex items-center justify-center gap-1.5 border border-black font-mono text-xs font-bold uppercase transition-colors disabled:cursor-not-allowed'

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
      <p className="p-6 font-mono text-sm text-black">{message}</p>
      <div className="flex justify-end gap-3 border-t border-black px-6 py-4">
        <BrutalSecondaryButton type="button" onClick={onClose}>
          Cancel
        </BrutalSecondaryButton>
        <BrutalButton type="button" onClick={onConfirm}>
          {confirmLabel}
        </BrutalButton>
      </div>
    </BrutalModal>
  )
}
