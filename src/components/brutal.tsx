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

/** Hairline-gridded modal with a hard black offset shadow; closes on Escape. */
export function BrutalModal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEscape(open, onClose)

  if (!open) return null
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
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto border-2 border-black bg-white bg-[length:16px_16px] bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] shadow-[8px_8px_0_0_#000]">
        <header className="flex items-center justify-between border-b border-black bg-white px-6 py-4">
          <h2 className="text-2xl font-bold tracking-tight text-black uppercase">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className={`flex h-8 items-center gap-1 border border-black px-3 font-mono text-xs font-bold tracking-wider uppercase ${invertOnHover}`}
          >
            <span>Esc</span>
            <span className="text-base leading-none">×</span>
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}

const labelClass = 'block font-mono text-xs font-bold tracking-wider text-black uppercase'

export function BrutalField({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
          {required && <span className="font-extrabold"> *</span>}
        </label>
        {required && <span className="font-mono text-[10px] text-neutral-500 uppercase">Required field</span>}
      </div>
      {children}
    </div>
  )
}

const controlClass =
  'w-full rounded-none border border-black bg-neutral-50 font-mono text-black transition-all focus:bg-white focus:outline-none'

export function BrutalInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`${controlClass} h-11 px-3 text-sm shadow-[2px_2px_0_0_#000] placeholder:text-neutral-600 ${className}`}
    />
  )
}

export function BrutalSelect({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`brutal-select ${controlClass} h-10 cursor-pointer appearance-none pr-8 pl-3 text-xs tracking-tight uppercase ${className}`}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center border-l border-black bg-neutral-200 px-2 text-black">
        <span className="font-mono text-[10px] font-bold">▼</span>
      </div>
    </div>
  )
}

const buttonBase =
  'flex h-11 flex-1 items-center justify-center border border-black font-mono text-xs font-bold uppercase transition-colors disabled:cursor-not-allowed sm:flex-initial'

export function BrutalButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`${buttonBase} bg-black px-8 tracking-widest text-white shadow-[3px_3px_0_0_var(--color-neutral-500)] hover:bg-neutral-800 active:bg-neutral-900 ${className}`}
    />
  )
}

export function BrutalSecondaryButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`${buttonBase} bg-transparent px-6 tracking-wider text-black ${invertOnHover} ${className}`}
    />
  )
}
