import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.tsx'
import { useAuth } from './auth/useAuth.ts'
import { AppShell } from './components/AppShell.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { Funds } from './pages/Funds.tsx'
import { Bills } from './pages/Bills.tsx'
import { Expendable } from './pages/Expendable.tsx'
import { Debts } from './pages/Debts.tsx'
import { Savings } from './pages/Savings.tsx'
import { SignIn } from './pages/SignIn.tsx'

const queryClient = new QueryClient()

function AuthedApp() {
  const { user } = useAuth()
  if (!user) return <SignIn />
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="funds" element={<Funds />} />
        <Route path="bills" element={<Bills />} />
        <Route path="expendable" element={<Expendable />} />
        <Route path="debts" element={<Debts />} />
        <Route path="savings" element={<Savings />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthedApp />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
