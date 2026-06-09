import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.tsx'
import { useAuth } from './auth/useAuth.ts'
import { AppShell } from './components/AppShell.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { Placeholder } from './pages/Placeholder.tsx'
import { SignIn } from './pages/SignIn.tsx'

const queryClient = new QueryClient()

function AuthedApp() {
  const { user } = useAuth()
  if (!user) return <SignIn />
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="funds" element={<Placeholder name="Funds" />} />
        <Route path="bills" element={<Placeholder name="Bills" />} />
        <Route path="expendable" element={<Placeholder name="Expendable" />} />
        <Route path="debts" element={<Placeholder name="Debts" />} />
        <Route path="savings" element={<Placeholder name="Savings" />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AuthedApp />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
