import { Modal } from './Modal.tsx'
import { Button, SecondaryButton, DangerButton } from './ui.tsx'

/**
 * Confirmation for an action worth a second look — deletes, closing a bill, and
 * switching currency.
 *
 * Tone picks the confirm button: 'danger' for anything that destroys or freezes
 * data, 'primary' for a reversible change, where red would overstate the stakes.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  tone = 'danger',
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  tone?: 'danger' | 'primary'
  onConfirm: () => void
  onClose: () => void
}) {
  const Confirm = tone === 'danger' ? DangerButton : Button
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-sm text-ink">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <SecondaryButton type="button" onClick={onClose}>
          Cancel
        </SecondaryButton>
        <Confirm type="button" onClick={onConfirm}>
          {confirmLabel}
        </Confirm>
      </div>
    </Modal>
  )
}
