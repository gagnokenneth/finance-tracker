import { Modal } from './Modal.tsx'
import { SecondaryButton, DangerButton } from './ui.tsx'

/** Confirmation for destructive actions. Every use here deletes something. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  pending?: boolean
  error?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-sm text-slate-700">{message}</p>
      {error && <p className="mt-2 text-sm text-red-600">Could not delete. Please try again.</p>}
      <div className="mt-4 flex justify-end gap-2">
        <SecondaryButton type="button" onClick={onClose}>
          Cancel
        </SecondaryButton>
        <DangerButton type="button" onClick={onConfirm} disabled={pending}>
          {confirmLabel}
        </DangerButton>
      </div>
    </Modal>
  )
}
