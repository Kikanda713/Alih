import { useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { universeHref } from '../lib/universes'

/*
 * Lien d'univers de l'en-tête. Au survol (ou focus clavier), une petite carte
 * donne le titre complet et ce que l'univers contient. Rendue en portail et en
 * position fixe : la barre d'univers défile horizontalement et rognerait une
 * infobulle positionnée en CSS.
 */
const TIP_WIDTH = 260

export default function UniverseNavLink({ universe: u, active }) {
  const [tip, setTip] = useState(null)
  const id = useId()

  const show = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const left = Math.max(8, Math.min(r.left, window.innerWidth - TIP_WIDTH - 8))
    setTip({ left, top: r.bottom + 6 })
  }
  const hide = () => setTip(null)

  return (
    <>
      <Link
        to={universeHref(u)}
        className={`mk-unav-link${active ? ' active' : ''}`}
        aria-describedby={tip ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={hide}
      >
        <u.icon /> {u.label}
      </Link>
      {tip && createPortal(
        <div id={id} role="tooltip" className="mk-unav-tip" style={{ left: tip.left, top: tip.top, width: TIP_WIDTH }}>
          <b>{u.title}</b>
          <span>{u.desc}</span>
        </div>,
        document.body,
      )}
    </>
  )
}
