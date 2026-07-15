import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { FaMapMarkerAlt, FaGlobeAfrica } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { Select } from '../../components/ui.jsx'

/**
 * Périmètre ville du back-office, partagé par toutes les pages admin.
 * - Admin GLOBAL : `city` = ville choisie dans le sélecteur (null = tout le pays).
 * - Admin de VILLE : `city` = sa ville, VERROUILLÉE (pas de sélecteur).
 * Chaque page ajoute `?city=<city>` à ses appels via `withCity()`.
 */
const Ctx = createContext({ loading: true, global: true, city: null, lockedCity: null, cities: [], setCity: () => {}, withCity: (p) => p })

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s }

export function AdminScopeProvider({ children }) {
  const api = useTindisaApi()
  const [loading, setLoading] = useState(true)
  const [info, setInfo] = useState({ global: true, lockedCity: null, cities: [] })
  const [city, setCity] = useState(null)

  useEffect(() => {
    let alive = true
    api.get('/v1/admin/scope')
      .then((r) => {
        if (!alive || !r) return
        setInfo({ global: !!r.global, lockedCity: r.lockedCity || null, cities: r.cities || [] })
        // Admin de ville : ville imposée. Admin global : démarre sur "tout le pays".
        if (!r.global && r.lockedCity) setCity(r.lockedCity)
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const withCity = useCallback(
    (path) => {
      if (!city) return path
      return path + (path.includes('?') ? '&' : '?') + 'city=' + encodeURIComponent(city)
    },
    [city],
  )

  const value = useMemo(
    () => ({ loading, global: info.global, city, lockedCity: info.lockedCity, cities: info.cities, setCity, withCity }),
    [loading, info, city, withCity],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAdminView() {
  return useContext(Ctx)
}

/** Barre de portée : sélecteur ville (admin global) ou badge ville verrouillée. */
export function CityScopeBar() {
  const { global, city, lockedCity, cities, setCity } = useAdminView()
  if (!global) {
    return (
      <div className="admin-scope-bar">
        <span className="admin-scope-chip locked"><FaMapMarkerAlt /> {cap(lockedCity) || 'Ville'}</span>
      </div>
    )
  }
  const options = [
    { value: '', label: 'Tout le pays' },
    ...cities.map((c) => ({ value: c, label: cap(c) })),
  ]
  return (
    <div className="admin-scope-bar">
      <FaGlobeAfrica className="admin-scope-ico" />
      <Select
        value={city || ''}
        onChange={(e) => setCity((e.target?.value ?? e) || null)}
        options={options}
        className="admin-scope-select"
      />
    </div>
  )
}
