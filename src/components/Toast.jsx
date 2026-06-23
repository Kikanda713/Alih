import { createContext, useContext, useState, useCallback } from 'react'
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa'

const ToastContext = createContext({ notify: () => {} })

let seq = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (message, tone = 'info', timeout = 4000) => {
      const id = ++seq
      setToasts((list) => [...list, { id, message, tone }])
      if (timeout) setTimeout(() => dismiss(id), timeout)
      return id
    },
    [dismiss],
  )

  const icon = { success: <FaCheckCircle />, error: <FaExclamationCircle />, info: <FaInfoCircle /> }

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="toast-stack" role="region" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <span className="toast-icon">{icon[t.tone] || icon.info}</span>
            <span className="toast-msg">{t.message}</span>
            <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Fermer">
              <FaTimes />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
