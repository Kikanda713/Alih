import { useState, useRef, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate } from 'react-router-dom'
import { FaChevronDown, FaThLarge, FaSignOutAlt, FaUserShield, FaStore } from 'react-icons/fa'
import { auth0Config, isAuth0Configured } from '../auth/config'
import AuthButtons from '../auth/AuthButtons.jsx'
import { useT } from '../i18n/index.jsx'
import { useIsAdmin } from '../auth/roles'
import { DEMO_MODE } from '../demo/demo' // DEMO: retirer en production
import DemoProfileMenu from '../demo/DemoProfileMenu.jsx' // DEMO: retirer en production

function initials(user) {
  const src = user?.name || user?.email || '?'
  return src.trim().slice(0, 2).toUpperCase()
}

function ProfileMenuInner() {
  const { isAuthenticated, isLoading, user, logout } = useAuth0()
  const { t } = useT()
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (isLoading) return <span className="ui-spinner-dot" aria-label="…" />
  if (!isAuthenticated) return <AuthButtons />

  return (
    <div className="profile-menu" ref={ref}>
      <button className="profile-trigger" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {user?.picture ? (
          <img className="profile-avatar" src={user.picture} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="profile-avatar profile-avatar-initials">{initials(user)}</span>
        )}
        <span className="profile-name">{user?.name || user?.email}</span>
        <FaChevronDown className={`profile-caret${open ? ' open' : ''}`} />
      </button>

      {open && (
        <div className="profile-dropdown" role="menu">
          <div className="profile-dropdown-head">
            <span className="profile-dropdown-name">{user?.name}</span>
            <span className="profile-dropdown-email">{user?.email}</span>
          </div>
          <button
            className="profile-dropdown-item"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              navigate('/dashboard')
            }}
          >
            <FaThLarge /> {t('profile.dashboard')}
          </button>
          <button
            className="profile-dropdown-item"
            role="menuitem"
            onClick={() => { setOpen(false); navigate('/dashboard/boutique') }}
          >
            <FaStore /> Ma boutique
          </button>
          {isAdmin && (
            <button
              className="profile-dropdown-item"
              role="menuitem"
              onClick={() => { setOpen(false); navigate('/admin') }}
            >
              <FaUserShield /> {t('profile.admin')}
            </button>
          )}
          <button
            className="profile-dropdown-item danger"
            role="menuitem"
            onClick={() => logout({ logoutParams: { returnTo: auth0Config.logoutUrl } })}
          >
            <FaSignOutAlt /> {t('profile.logout')}
          </button>
        </div>
      )}
    </div>
  )
}

export default function ProfileMenu() {
  // DEMO: en mode démo, profil/connexion fictifs. Retirer ces 2 lignes en prod.
  if (DEMO_MODE) return <DemoProfileMenu />
  // Si Auth0 n'est pas configuré, useAuth0() n'a pas de provider -> on rend les
  // boutons (mode dégradé) sans appeler le hook.
  if (!isAuth0Configured) return <AuthButtons />
  return <ProfileMenuInner />
}
