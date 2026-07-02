import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FaTimes, FaEllipsisH } from 'react-icons/fa'

/*
 * Petit kit de composants réutilisables Tindisa — CSS pur (App.css, classes .ui-*),
 * sur le design system existant (terracotta / ébène / ivoire). Design épuré.
 */

export function Button({ variant = 'primary', size, as, className = '', children, ...props }) {
  const Cmp = as || 'button'
  const cls = `ui-btn ui-btn-${variant}${size ? ` ui-btn-${size}` : ''} ${className}`.trim()
  return (
    <Cmp className={cls} {...props}>
      {children}
    </Cmp>
  )
}

export function Card({ className = '', children, ...props }) {
  return (
    <div className={`ui-card ${className}`.trim()} {...props}>
      {children}
    </div>
  )
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`ui-badge ui-badge-${tone}`}>{children}</span>
}

export function Field({ label, hint, error, children }) {
  return (
    <label className="ui-field">
      {label && <span className="ui-field-label">{label}</span>}
      {children}
      {hint && !error && <span className="ui-field-hint">{hint}</span>}
      {error && <span className="ui-field-error">{error}</span>}
    </label>
  )
}

export function Input({ className = '', ...props }) {
  return <input className={`ui-input ${className}`.trim()} {...props} />
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={`ui-input ui-textarea ${className}`.trim()} {...props} />
}

// Select natif stylé comme Input. `options` = [{ id|value, label }] ou [string].
// `placeholder` ajoute une option vide en tête.
export function Select({ className = '', options = [], placeholder, ...props }) {
  return (
    <select className={`ui-input ui-select ${className}`.trim()} {...props}>
      {placeholder != null && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const value = typeof o === 'string' ? o : (o.id ?? o.value)
        const label = typeof o === 'string' ? o : o.label
        return (
          <option key={value} value={value}>
            {label}
          </option>
        )
      })}
    </select>
  )
}

export function Spinner({ label }) {
  return (
    <div className="ui-spinner" role="status" aria-live="polite">
      <span className="ui-spinner-dot" />
      {label && <span className="ui-spinner-label">{label}</span>}
    </div>
  )
}

export function EmptyState({ icon, title, text, action }) {
  return (
    <div className="ui-empty">
      {icon && <div className="ui-empty-icon">{icon}</div>}
      {title && <h3 className="ui-empty-title">{title}</h3>}
      {text && <p className="ui-empty-text">{text}</p>}
      {action}
    </div>
  )
}

export function Modal({ open, title, onClose, children, footer }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="ui-modal-overlay" onMouseDown={onClose}>
      <div className="ui-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ui-modal-head">
          <h2 className="ui-modal-title">{title}</h2>
          <button className="ui-modal-close" onClick={onClose} aria-label="Fermer">
            <FaTimes />
          </button>
        </div>
        <div className="ui-modal-body">{children}</div>
        {footer && <div className="ui-modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmModal({ open, title, message, confirmLabel, cancelLabel, danger, busy, onConfirm, onClose }) {
  return (
    <Modal open={open} title={title} onClose={busy ? undefined : onClose}>
      <p className="ui-confirm-text">{message}</p>
      <div className="ui-modal-foot">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          {cancelLabel || 'Annuler'}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
          {confirmLabel || 'Confirmer'}
        </Button>
      </div>
    </Modal>
  )
}

/**
 * Menu d'actions « ⋯ » (kebab). Positionné en portail (document.body) pour ne
 * jamais être rogné par un conteneur en overflow (ex. tableaux scrollables).
 * items: [{ label, icon?, onClick, danger?, disabled? }] — les entrées falsy sont ignorées.
 */
export function ActionMenu({ items = [], label = 'Actions' }) {
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  const open = !!pos
  const list = items.filter(Boolean)

  const toggle = () => {
    if (open) { setPos(null); return }
    const r = btnRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 4, left: Math.max(8, r.right - 190) })
  }

  useEffect(() => {
    if (!open) return
    const close = () => setPos(null)
    const onDown = (e) => {
      if (!e.target.closest?.('.action-menu-list') && !e.target.closest?.('.action-menu-btn')) close()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <>
      <button ref={btnRef} type="button" className="action-menu-btn" aria-label={label} aria-haspopup="menu" onClick={toggle}>
        <FaEllipsisH />
      </button>
      {open && createPortal(
        <div className="action-menu-list" role="menu" style={{ top: pos.top, left: pos.left }}>
          {list.map((it, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              className={`action-menu-item ${it.danger ? 'danger' : ''}`}
              disabled={it.disabled}
              onClick={() => { setPos(null); it.onClick?.() }}
            >
              {it.icon}<span>{it.label}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}
