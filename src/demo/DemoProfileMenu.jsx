/* MODE DÉMO — bouton de connexion démo + profil. À SUPPRIMER en production. */
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaChevronDown, FaThLarge, FaSignOutAlt, FaPlayCircle, FaUserShield } from 'react-icons/fa'
import { demoUser, isDemoSession, startDemoSession, endDemoSession } from './demo'
import { isAdminRoles } from '../auth/roles'
import { useT } from '../i18n/index.jsx'

export default function DemoProfileMenu() {
  const { t } = useT()
  const navigate = useNavigate()
  const [session, setSession] = useState(isDemoSession())
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (!session) {
    return (
      <button
        className="ui-btn ui-btn-primary ui-btn-sm"
        onClick={() => {
          startDemoSession()
          setSession(true)
          navigate('/dashboard')
        }}
      >
        <FaPlayCircle /> {t('demo.login')}
      </button>
    )
  }

  return (
    <div className="profile-menu" ref={ref}>
      <button className="profile-trigger" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="profile-avatar profile-avatar-initials">MD</span>
        <span className="profile-name">{demoUser.name}</span>
        <FaChevronDown className={`profile-caret${open ? ' open' : ''}`} />
      </button>
      {open && (
        <div className="profile-dropdown" role="menu">
          <div className="profile-dropdown-head">
            <span className="profile-dropdown-name">{demoUser.name}</span>
            <span className="profile-dropdown-email">{demoUser.email}</span>
          </div>
          <button className="profile-dropdown-item" role="menuitem" onClick={() => { setOpen(false); navigate('/dashboard') }}>
            <FaThLarge /> {t('profile.dashboard')}
          </button>
          {isAdminRoles(demoUser.roles) && (
            <button className="profile-dropdown-item" role="menuitem" onClick={() => { setOpen(false); navigate('/admin') }}>
              <FaUserShield /> {t('profile.admin')}
            </button>
          )}
          <button className="profile-dropdown-item danger" role="menuitem" onClick={() => { endDemoSession(); setSession(false); navigate('/') }}>
            <FaSignOutAlt /> {t('demo.exit')}
          </button>
        </div>
      )}
    </div>
  )
}
