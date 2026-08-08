import { useContext } from 'react'
import { ToastContext } from '../components/ToastProvider.tsx'
import type { ShowError } from '../components/ToastProvider.tsx'

export function useToast(): ShowError {
  const showError = useContext(ToastContext)
  if (!showError) throw new Error('useToast must be used inside ToastProvider')
  return showError
}
