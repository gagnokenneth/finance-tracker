import { createContext, useContext } from 'react'

/*
 * The revamp's look table and the context that carries it, apart from
 * brutal.tsx so controls in their own files (BrutalDatePicker) can share it:
 * a component file may only export components.
 */

/**
 * The two looks the designs use, as one table so a look is changed in one
 * place: 'grid' (Add Task — hairline-gridded frame, grey fields with a hard
 * shadow, boxed ▼) and 'plain' (Edit Task — white and flat, a square marker
 * before the title, bare chevrons, shorter buttons). A modal sets the look
 * and every control inside it inherits it.
 */
export const LOOKS = {
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
    body: 'space-y-5 px-6 pt-6 pb-5',
    footer: 'mx-6 mb-6 border-t-2 pt-4',
    footerAlign: '',
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
    body: 'flex flex-col gap-5 p-6',
    footer: 'border-t px-6 py-4',
    footerAlign: 'justify-end',
  },
}

export type LookName = keyof typeof LOOKS

/** Pages get 'plain'; a modal sets its own look for what it contains. */
export const LookContext = createContext<LookName>('plain')
export const useLook = () => LOOKS[useContext(LookContext)]

/** Every field's base: square, black-bordered, mono, ringed when focused. */
export const controlClass =
  'w-full rounded-none border border-black font-mono text-black transition-all focus:bg-white focus:outline-2 focus:-outline-offset-2 focus:outline-black'
