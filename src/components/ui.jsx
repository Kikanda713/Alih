import { useEffect } from 'react'
import { FaTimes } from 'react-icons/fa'

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
