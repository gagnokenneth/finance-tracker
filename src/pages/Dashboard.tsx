import { useFinanceData } from '../hooks/useFinanceData.ts'
import { MonthCalendar } from '../components/MonthCalendar.tsx'
import { LoadError } from '../components/LoadError.tsx'
import { LoadingScreen } from '../components/LoadingScreen.tsx'

export function Dashboard() {
  const { data, isPending, isError, error } = useFinanceData()

  if (isPending) return <LoadingScreen />
  if (isError || !data) return <LoadError error={error} />

  return <MonthCalendar data={data} />
}
