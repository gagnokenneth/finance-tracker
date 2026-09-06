import { useState } from 'react'
import type { ReactNode } from 'react'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.tsx'
import { useAuth } from './auth/useAuth.ts'
import { makeQueryClient, persistOptionsFor } from './lib/queryClient.ts'
import { AppShell } from './components/AppShell.tsx'
import { ToastProvider } from './components/ToastProvider.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { Tasks } from './pages/Tasks.tsx'
import { Notes } from './pages/Notes.tsx'
import { NoteDetail } from './pages/NoteDetail.tsx'
import { Goals } from './pages/Goals.tsx'
import { Debts } from './pages/Debts.tsx'
import { DebtDetail } from './pages/DebtDetail.tsx'
import { Bills } from './pages/Bills.tsx'
import { BillDetail } from './pages/BillDetail.tsx'
import { Income } from './pages/Income.tsx'
import { Savings } from './pages/Savings.tsx'
import { Settings } from './pages/Settings.tsx'
import { SignIn } from './pages/SignIn.tsx'

function AuthedApp() {
  const { user } = useAuth()
  if (!user) return <SignIn />
  // Dashboard, Tasks, Notes, Goals, Debts, Bills, Income, Savings and
  // Settings are exposed. The other module pages still exist in
  // src/pages/ but are deliberately unregistered; unknown paths land on
  // the Dashboard. Calendar has no route of its own — it's embedded
  // directly in Dashboard as <MonthCalendar>, not a separate page.
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="notes" element={<Notes />} />
        <Route path="notes/:id" element={<NoteDetail />} />
        <Route path="goals" element={<Goals />} />
        <Route path="debts" element={<Debts />} />
        <Route path="debts/:id" element={<DebtDetail />} />
        <Route path="bills" element={<Bills />} />
        <Route path="bills/:id" element={<BillDetail />} />
        <Route path="income" element={<Income />} />
        <Route path="savings" element={<Savings />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

/**
 * A fresh QueryClient per signed-in user, and persistence keyed to that user.
 * Both matter on a shared browser: the client is what stops one account's data
 * from being served to the next from memory, and the storage key is what stops
 * it coming back from disk. Signed out there is nothing to persist, so the
 * plain provider is used.
 */
function SessionScopedQuery({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  // Signed out there is nothing to cache, so no client is provided at all —
  // which means nothing rendered on the sign-in screen may use a query hook.
  if (!user) return children
  return (
    <ScopedProviders key={user.id} userId={user.id}>
      {children}
    </ScopedProviders>
  )
}

function ScopedProviders({ userId, children }: { userId: number; children: ReactNode }) {
  // Run once per mount, and the key above remounts on the user, so a different
  // account cannot inherit the last one's cache.
  const [client] = useState(makeQueryClient)
  const [persistOptions] = useState(() => persistOptionsFor(userId))

  return (
    <PersistQueryClientProvider client={client} persistOptions={persistOptions}>
      {children}
    </PersistQueryClientProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <SessionScopedQuery>
        <ToastProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <AuthedApp />
          </BrowserRouter>
        </ToastProvider>
      </SessionScopedQuery>
    </AuthProvider>
  )
}
