import { useFinanceData } from '../hooks/useFinanceData.ts'
import { computeSummary } from '../lib/summary.ts'
import { monthKey } from '../lib/currentMonth.ts'
import { Card } from '../components/Card.tsx'
import { Money } from '../components/Money.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'

export function Dashboard() {
  const { data, isPending, isError } = useFinanceData()

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <p className="text-red-600">Failed to load data.</p>

  const s = computeSummary(data, monthKey())

  const metrics: Array<{ label: string; value: number }> = [
    { label: 'Total Funds', value: s.totalFunds },
    { label: 'Total Bills', value: s.totalBills },
    { label: 'Bills Paid', value: s.billsPaid },
    { label: 'Monthly Expendable', value: s.monthlyExpendable },
    { label: 'Spent This Month', value: s.spentThisMonth },
    { label: 'Total Debt', value: s.totalDebt },
    { label: 'Savings Total', value: s.savingsTotal },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-sm font-medium text-slate-500">Remaining Balance</h2>
        <Money value={s.remainingBalance} className="text-3xl font-bold" />
      </Card>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label} title={m.label}>
            <Money value={m.value} className="text-xl font-semibold" />
          </Card>
        ))}
      </div>
    </div>
  )
}
