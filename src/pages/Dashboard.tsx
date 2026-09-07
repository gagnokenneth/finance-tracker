import { useFinanceData } from '../hooks/useFinanceData.ts'
import { MonthCalendar } from '../components/MonthCalendar.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'

export function Dashboard() {
  const { data, isPending, isError, error } = useFinanceData()

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-soft">What's coming up.</p>
      </div>

      <MonthCalendar data={data} />
    </div>
  )
}
