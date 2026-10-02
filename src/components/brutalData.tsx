import type { ReactNode } from 'react'
import { dueStatus, ROW_STATUS_LABEL } from '../lib/debts.ts'
import type { RowStatus } from '../lib/debts.ts'
import { Money } from './Money.tsx'
import { PendingBadge } from './PendingBadge.tsx'
import { DeleteIcon, EditIcon } from './icons.tsx'
import { BrutalIconButton, labelClass, panelTitleClass, smallButtonClass, smallPrimaryButtonClass } from './brutal.tsx'

/*
 * The revamp's monochrome data displays Debts and Bills share. BrutalTable is
 * kept apart from the old Table, which Income and Savings still render.
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

/** Every chip's shape: a status badge or a descriptive tag. */
const chipClass = 'inline-block border px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider whitespace-nowrap uppercase'

export function BrutalStatusBadge({ status }: { status: RowStatus }) {
  return (
    <span className={`${chipClass} ${STATUS_CLASS[status]}`}>
      {ROW_STATUS_LABEL[status]}
    </span>
  )
}

/** A plain descriptive tag — a bill's type and schedule, or 'Closed'
 *  (muted, since a closed bill is history). */
export function BrutalTag({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <span className={`${chipClass} ${muted ? STATUS_CLASS.paid : 'border-black bg-white text-black'}`}>
      {children}
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

/**
 * A bordered ledger table: black-ruled header, hairline rows. `actions` adds
 * the trailing, right-aligned Actions column a row's BrutalRowActions sits in.
 */
export function BrutalTable({
  columns,
  actions = false,
  children,
}: {
  columns: string[]
  actions?: boolean
  children: ReactNode
}) {
  const th = `${cellClass} font-mono text-xs font-bold tracking-wider whitespace-nowrap text-black uppercase`
  return (
    <div className="overflow-x-auto border border-black bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-black text-left">
          <tr>
            {columns.map((label) => (
              <th key={label} className={th}>
                {label}
              </th>
            ))}
            {actions && <th className={`${th} text-right`}>Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 text-black">{children}</tbody>
      </table>
    </div>
  )
}

/** A money cell, or a dash for a figure not set yet — never a zero it doesn't mean. */
export function BrutalFigure({ value }: { value: number | undefined }) {
  return value === undefined ? (
    <span className="font-mono text-neutral-400">—</span>
  ) : (
    <Money value={value} tone="inherit" className="font-bold" />
  )
}

/** A ledger row's status: Paid with when and how much (and whether savings
 *  funded it), or its due-state chip while unpaid. */
export function BrutalRowStatus({
  row,
  fromSavings,
}: {
  row: { due_date: string; paid: boolean; paid_date?: string; paid_amount?: number }
  fromSavings: boolean
}) {
  if (!row.paid) return <BrutalStatusBadge status={dueStatus(row.due_date)} />
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <BrutalStatusBadge status="paid" />
      <span className="tnum font-mono text-xs text-neutral-500">
        {row.paid_date}
        {row.paid_amount !== undefined && (
          <>
            {' · '}
            <Money value={row.paid_amount} tone="inherit" className="text-xs" />
          </>
        )}
      </span>
      {fromSavings && <span className="font-mono text-xs text-neutral-500">from savings</span>}
    </span>
  )
}

/**
 * A ledger row's actions. A pending row has no backend id yet, so every
 * action would be sent against an id the backend has never seen — it gets the
 * pending badge instead. An unpriced unpaid row leads with Set amount, its
 * actual next step, and keeps Pay visible but inert so the sequence stays
 * legible.
 */
export function BrutalRowActions({
  pending,
  paid,
  priced,
  onSetAmount,
  onPay,
  onEdit,
  onDelete,
}: {
  pending: boolean
  paid: boolean
  priced: boolean
  onSetAmount: () => void
  onPay: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  if (pending) return <PendingBadge />
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {!paid && !priced && (
        <button type="button" className={smallButtonClass} onClick={onSetAmount}>
          Set amount
        </button>
      )}
      {!paid && (
        <button type="button" className={smallPrimaryButtonClass} disabled={!priced} onClick={onPay}>
          Pay
        </button>
      )}
      <BrutalIconButton size="sm" label="Edit" onClick={onEdit}>
        <EditIcon />
      </BrutalIconButton>
      <BrutalIconButton size="sm" label="Delete" onClick={onDelete}>
        <DeleteIcon />
      </BrutalIconButton>
    </div>
  )
}

/** One labelled figure in a detail hero's dashed-ruled row. */
export function BrutalStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <dt className={`${labelClass} text-neutral-500`}>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

/**
 * A record's bordered summary panel: its name and descriptive tags, its
 * actions, anything the record leads with (a payoff strip), then its
 * BrutalStat figures under a dashed rule.
 */
export function BrutalDetailHero({
  title,
  tags,
  actions,
  lead,
  children,
}: {
  title: string
  tags: ReactNode
  actions: ReactNode
  lead?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="border border-black bg-white p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <h1 className={panelTitleClass}>{title}</h1>
          <div className="flex flex-wrap gap-2">{tags}</div>
        </div>
        <div className="flex items-center gap-3">{actions}</div>
      </div>
      {lead && <div className="mt-8">{lead}</div>}
      <dl className="mt-8 grid gap-6 border-t border-dashed border-neutral-400 pt-6 sm:grid-cols-2">{children}</dl>
    </section>
  )
}
