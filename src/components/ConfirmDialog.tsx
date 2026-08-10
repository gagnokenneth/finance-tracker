import { Modal } from './Modal.tsx'
import { SecondaryButton, DangerButton } from './ui.tsx'

/** Confirmation for destructive actions — deletes, and closing a bill. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-sm text-ink">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <SecondaryButton type="button" onClick={onClose}>
          Cancel
        </SecondaryButton>
        <DangerButton type="button" onClick={onConfirm}>
          {confirmLabel}
        </DangerButton>
      </div>
    </Modal>
  )
}
