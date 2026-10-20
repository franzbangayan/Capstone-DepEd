import '../styles/ConfirmDialog.css'
import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'

/*
 * Drop-in replacement for window.confirm.
 *
 *   import { confirmDialog } from '../components/ConfirmDialog'
 *
 *   if (!(await confirmDialog({
 *     title: 'Delete teacher?',
 *     message: 'Enrique Cruz will be permanently removed.',
 *     confirmLabel: 'Delete',
 *     danger: true,
 *   }))) return
 *
 * Resolves true on confirm, false on cancel / Escape / backdrop click.
 */

const Dialog = ({ title, message, confirmLabel, cancelLabel, danger, onResult }) => {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onResult(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onResult])

  return (
    <div className="confirm-overlay" onClick={() => onResult(false)}>
      <div
        className="confirm-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={danger ? 'confirm-icon danger' : 'confirm-icon'}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h2 id="confirm-title" className="confirm-title">{title}</h2>
        {message && <p className="confirm-message">{message}</p>}

        <div className="confirm-actions">
          <button type="button" className="confirm-btn confirm-cancel" onClick={() => onResult(false)}>
            {cancelLabel}
          </button>
          <button
            type="button"
            autoFocus
            className={danger ? 'confirm-btn confirm-ok danger' : 'confirm-btn confirm-ok'}
            onClick={() => onResult(true)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export const confirmDialog = ({
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
} = {}) => new Promise((resolve) => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)

  const finish = (result) => {
    root.unmount()
    host.remove()
    resolve(result)
  }

  root.render(
    <Dialog
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      danger={danger}
      onResult={finish}
    />
  )
})