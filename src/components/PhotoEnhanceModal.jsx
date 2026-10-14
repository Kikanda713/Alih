import { useState } from 'react'
import { FaMagic, FaSpinner, FaUndo, FaCheck } from 'react-icons/fa'
import { useTindisaApi } from '../api/client'
import { useLoad } from '../api/useLoad'
import { useToast } from './useToast'
import { Button, Badge, Modal, Spinner } from './ui.jsx'
import './PhotoEnhanceModal.css'

/*
 * Photo de couverture au format e-commerce (back-office ET espace commerçant).
 * Avant / après avec curseur, mode Studio (fond blanc) ou Scène (décor réel),
 * choix de la photo affichée sur le marché. L'original n'est jamais supprimé.
 *
 * `endpoints` : { state, enhance, accept, revert } (chemins API déjà bornés au
 * périmètre : admin de ville ou propriétaire de l'annonce).
 */

import { MODE_LABEL } from './photoModes.js'
const MODE_HELP = {
  packshot: 'Fond blanc, produit redressé et centré, format carré.',
  scene: 'Décor réel conservé (véhicule, terrain, maison…), lumière et cadrage corrigés.',
}

/** Curseur avant / après (glisser pour comparer). */
export function BeforeAfter({ before, after }) {
  const [pos, setPos] = useState(50)
  return (
    <div className="pe-ba" style={{ '--pe-pos': `${pos}%` }}>
      <img className="pe-ba-img" src={before} alt="Photo originale" />
      <img className="pe-ba-img pe-ba-after" src={after} alt="Photo améliorée" />
      <span className="pe-ba-line" aria-hidden="true" />
      <span className="pe-ba-tag pe-ba-tag-l">Avant</span>
      <span className="pe-ba-tag pe-ba-tag-r">Après</span>
      <input
        className="pe-ba-range"
        type="range"
        min="0"
        max="100"
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Comparer avant et après"
      />
    </div>
  )
}

export default function PhotoEnhanceModal({ open, title, endpoints, onClose, onChanged }) {
  const api = useTindisaApi()
  const { notify } = useToast()
  const [busy, setBusy] = useState(null)
  const [mode, setMode] = useState('auto')
  const q = useLoad(() => (open && endpoints?.state ? api.get(endpoints.state) : Promise.resolve(null)), [open, endpoints?.state])
  const st = q.data

  const act = async (kind, fn, ok) => {
    setBusy(kind)
    try {
      await fn()
      if (ok) notify(ok, 'success')
      q.reload()
      onChanged?.()
    } catch (e) {
      notify(e?.message || 'Opération impossible', 'error')
    } finally {
      setBusy(null)
    }
  }
  const enhance = () => act('enhance', () => api.post(endpoints.enhance, mode === 'auto' ? {} : { mode }), 'Photo traitée : comparez puis choisissez la photo affichée')
  const accept = () => act('accept', () => api.post(endpoints.accept, {}), 'La photo améliorée est affichée sur le marché')
  const revert = () => act('revert', () => api.del(endpoints.revert), 'La photo originale est affichée sur le marché')

  const hasEnhanced = !!st?.enhancedUrl
  const shown = st?.status === 'done' ? 'enhanced' : 'original'
  const suggested = st?.suggestedMode

  return (
    <Modal open={open} wide title={title || 'Photo de couverture'} onClose={onClose}
      footer={
        <>
          {hasEnhanced && (shown === 'enhanced' || st.status === 'proposed') && (
            <Button variant="ghost" onClick={revert} disabled={!!busy}>
              {busy === 'revert' ? <FaSpinner className="spin" /> : <FaUndo />} Garder l’originale
            </Button>
          )}
          {hasEnhanced && shown !== 'enhanced' && (
            <Button onClick={accept} disabled={!!busy}>
              {busy === 'accept' ? <FaSpinner className="spin" /> : <FaCheck />} Utiliser la photo améliorée
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>Fermer</Button>
        </>
      }>
      {!st && q.loading && <Spinner label="Chargement de la photo…" />}
      {!st && !q.loading && <p className="dash-sub">Photo indisponible.</p>}
      {st && (
        <div className="pe-wrap">
          {hasEnhanced
            ? <BeforeAfter before={st.sourceUrl} after={st.enhancedUrl} />
            : <div className="pe-ba"><img className="pe-ba-img" src={st.sourceUrl} alt="Photo originale" /></div>}

          <div className="pe-meta">
            {hasEnhanced && st.mode && <Badge tone="neutral">{MODE_LABEL[st.mode] || st.mode}</Badge>}
            {hasEnhanced && <Badge tone={st.method === 'ai' ? 'success' : 'neutral'}>{st.method === 'ai' ? 'Retouche IA' : 'Retouche automatique'}</Badge>}
            {hasEnhanced && <Badge tone={shown === 'enhanced' ? 'success' : 'warn'}>{shown === 'enhanced' ? 'Affichée sur le marché' : st.status === 'proposed' ? 'À valider : originale affichée' : 'Originale affichée'}</Badge>}
            {st.status === 'pending' && <Badge tone="warn">En cours de traitement</Badge>}
          </div>
          {st.error && <p className="pe-error">Dernier essai échoué : {st.error}</p>}
          {st.note && st.method !== 'ai' && <p className="pe-note">L’IA n’a pas pu être utilisée, retouche de base appliquée (cadrage, lumière).</p>}
          {st.status === 'proposed' && <p className="pe-warn">Retouche par IA : comparez avec l’original (inscriptions, hologramme, étiquettes, défauts) avant de l’afficher sur le marché.{st.note && st.method === 'ai' ? ` ${st.note}` : ''}</p>}

          <div className="pe-modes" role="radiogroup" aria-label="Type de rendu">
            {['auto', 'packshot', 'scene'].map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m}
                className={`pe-mode${mode === m ? ' is-on' : ''}`} onClick={() => setMode(m)}>
                <strong>{m === 'auto' ? `Automatique${suggested ? ` (${MODE_LABEL[suggested]})` : ''}` : MODE_LABEL[m]}</strong>
                <span>{m === 'auto' ? 'Choisi selon la catégorie de l’annonce.' : MODE_HELP[m]}</span>
              </button>
            ))}
          </div>
          <div className="pe-run">
            <Button onClick={enhance} disabled={!!busy}>
              {busy === 'enhance' ? <><FaSpinner className="spin" /> Traitement… (jusqu’à 40 s)</> : <><FaMagic /> {hasEnhanced ? 'Refaire avec ce rendu' : 'Améliorer la photo'}</>}
            </Button>
            <span className="dash-sub">Le produit, ses couleurs et ses inscriptions ne doivent pas changer : vérifiez avant de l’afficher. L’original reste conservé.</span>
          </div>
        </div>
      )}
    </Modal>
  )
}
