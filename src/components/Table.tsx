import type { ReactNode } from 'react'

export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-edge bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-edge text-left">
          <tr>
            {headers.map((h, i) => (
              <th
                key={h || `col-${i}`}
                className="px-4 py-3 text-xs font-semibold tracking-wide text-ink-soft uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-edge text-ink">{children}</tbody>
      </table>
    </div>
  )
}
