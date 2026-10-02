import type { ReactNode } from 'react'
import { dueStatus, ROW_STATUS_LABEL } from '../lib/debts.ts'
import type { RowStatus } from '../lib/debts.ts'

/*
 * The revamp's monochrome takes on the data displays Debts (and later Bills)
 * share — kept apart from StatusBadge/DueBadge/InstallmentStrip/Table, which
 * pages not yet redesigned still render.
 */

/**
 * The same ranking the Dashboard calendar's chips use — 'late' is the one
 * solid black, 'paid' recedes to grey — drawn as badges: 'due-soon' outlined
 * black, 'upcoming' outlined grey. The label always carries the meaning;
 * weight only reinforces it.
 */
const STATUS_CLASS: Record<RowStatus, string> = {
  late: 'border-black bg-black text-white',
  'due-soon': 'border-black bg-white text-black',
  upcoming: 'border-neutral-400 bg-white text-neutral-500',
  paid: 'border-neutral-300 bg-neutral-200 text-neutral-700',
}

export function BrutalStatusBadge({ status }: { status: RowStatus }) {
  return (
    <span
      className={`inline-block border px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider whitespace-nowrap uppercase ${STATUS_CLASS[status]}`}
    >
      {ROW_STATUS_LABEL[status]}
    </span>
  )
}

/** Due date plus its status chip, or a dash when there is nothing due. The
 *  date takes its colour from the surrounding text. */
export function BrutalDueBadge({ dueDate, className = '' }: { dueDate: string | null; className?: string }) {
  if (!dueDate) return <span className="font-mono text-sm text-neutral-400">—</span>
  return (
    <span className="inline-flex items-center gap-3">
      <span className={`tnum font-mono ${className}`}>{dueDate}</span>
      <BrutalStatusBadge status={dueStatus(dueDate)} />
    </span>
  )
}

/** Beyond this, individual segments are too thin to read; use a plain bar. */
const MAX_SEGMENTS = 48

/**
 * The payoff strip. A fixed debt gets one countable segment per scheduled
 * payment, filled black once paid. A revolving debt has no finish line, so its
 * bar encodes no proportion: it runs out to the right instead of ending.
 */
export function BrutalInstallmentStrip(
  props: { kind: 'fixed'; paid: number; total: number } | { kind: 'revolving'; paid: number },
) {
  const caption = 'tnum shrink-0 font-mono text-xs text-neutral-600'

  if (props.kind === 'revolving') {
    const label = props.paid === 1 ? '1 statement paid' : `${props.paid} statements paid`
    return (
      <div className="flex items-center gap-4">
        <div
          role="img"
          aria-label={`Open-ended debt, ${label}`}
          className="h-1.5 flex-1 border border-black bg-linear-to-r from-black via-black/40 to-white"
        />
        <span className={caption}>Open-ended · {label}</span>
      </div>
    )
  }

  const { paid, total } = props
  const label = `${paid} of ${total} paid`
  return (
    <div className="flex items-center gap-4">
      {total > MAX_SEGMENTS ? (
        <div role="img" aria-label={label} className="h-2.5 flex-1 border border-black bg-neutral-200">
          <div className="h-full bg-black" style={{ width: `${(paid / total) * 100}%` }} />
        </div>
      ) : (
        <div role="img" aria-label={label} className="flex flex-1 gap-1.5">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-2.5 flex-1 border border-black ${i < paid ? 'bg-black' : 'bg-neutral-200'}`} />
          ))}
        </div>
      )}
      <span className={caption}>{label}</span>
    </div>
  )
}

/** Padding every ledger cell shares with its column header. */
export const cellClass = 'px-6 py-4'

export interface BrutalColumn {
  label: string
  /** A column of actions or figures reads from the right edge. */
  align?: 'right'
}

/** A bordered ledger table: black-ruled header, hairline rows. */
export function BrutalTable({ columns, children }: { columns: BrutalColumn[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-black bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-black text-left">
          <tr>
            {columns.map((c) => (
              <th
                key={c.label}
                className={`${cellClass} font-mono text-xs font-bold tracking-wider whitespace-nowrap text-black uppercase ${
                  c.align === 'right' ? 'text-right' : ''
                }`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 text-black">{children}</tbody>
      </table>
    </div>
  )
}
