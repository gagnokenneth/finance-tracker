import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.tsx'
import { useAuth } from './auth/useAuth.ts'
import { AppShell } from './components/AppShell.tsx'
import { Debts } from './pages/Debts.tsx'
import { DebtDetail } from './pages/DebtDetail.tsx'
import { Settings } from './pages/Settings.tsx'
import { SignIn } from './pages/SignIn.tsx'

const queryClient = new QueryClient()

function AuthedApp() {
  const { user } = useAuth()
  if (!user) return <SignIn />
  // Only Debts and Settings are exposed. The other module pages still exist in
  // src/pages/ but are deliberately unregistered; unknown paths land on Debts.
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/debts" replace />} />
        <Route path="debts" element={<Debts />} />
        <Route path="debts/:id" element={<DebtDetail />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/debts" replace />} />
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
