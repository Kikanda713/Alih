import { useEffect, useRef, useState } from 'react'
import { useLoad } from '../../api/useLoad'
import { FaMagic, FaImage, FaUndo, FaExclamationTriangle, FaSpinner } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useToast } from '../../components/useToast'
import { Button, Modal } from '../../components/ui.jsx'

/*
 * Amélioration IA des photos produit (netteté, exposition, bruit), fidèle au
 * produit d'origine. La version améliorée devient la COUVERTURE sur le marché ;
 * l'original reste conservé et visible sur la fiche. Réversible à tout moment.
 */

const PROVIDER_LABEL = { openrouter: 'OpenRouter', azure: 'Azure OpenAI', gemini: 'Gemini', openai: 'OpenAI' }
// Moteur : ancien format (« openrouter ») ou format des réglages IA ({ provider, model }).
const providerName = (p) => {
  if (p && typeof p === 'object') {
    const name = PROVIDER_LABEL[p.provider] || String(p.provider || 'IA')
    return p.model ? `${name} (${p.model})` : name
  }
  return PROVIDER_LABEL[p] || String(p ?? '')
}

/** Panneau global : état + lancement d'un lot sur les couvertures non traitées. */
export function EnhancePanel({ withParams, onProgress }) {
  const api = useTindisaApi()
  const { notify } = useToast()
  const [starting, setStarting] = useState(false)
  const wasRunning = useRef(false)
  const statusPath = withParams('/v1/admin/marketplace/enhance/status', {})
  const statusQ = useLoad(() => api.get(statusPath).catch(() => null), [statusPath])
  const st = statusQ.data
  const { reload, setData } = statusQ
  const running = !!st?.job?.running

  // Suivi du lot en cours (toutes les 4 s tant qu'il tourne).
  useEffect(() => {
    if (!running) return
    const t = setInterval(reload, 4000)
    return () => clearInterval(t)
  }, [running, reload])
  // Fin de lot : la liste des annonces est rafraîchie une fois.
  useEffect(() => {
    if (wasRunning.current && !running) onProgress?.()
    wasRunning.current = running
  }, [running, onProgress])

  const start = async () => {
    setStarting(true)
    try {
      const s = await api.post(withParams('/v1/admin/marketplace/enhance/batch', {}), { limit: 20 })
      setData(s)
      notify(s?.job?.total ? `${s.job.total} photo(s) en cours d’amélioration` : 'Aucune photo en attente', 'info')
    } catch (e) { notify(e?.message || 'Erreur', 'error') } finally { setStarting(false) }
  }

  if (!st) return null
  const job = st.job || {}
  const ratio = st.withPhoto ? Math.round((st.enhanced / st.withPhoto) * 100) : 0
  const configured = (st.providers || []).length > 0

  return (
    <section className="ui-card admin-enhance">
      <div className="admin-enhance-head">
        <span className="admin-enhance-ic"><FaMagic /></span>
        <div>
          <h3>Photos produit</h3>
          <p className="dash-sub">
            {st.enhanced} améliorée{st.enhanced > 1 ? 's' : ''} sur {st.withPhoto} ({ratio}%). Netteté et lumière uniquement : le produit,
            ses couleurs et ses inscriptions restent identiques. L’original est conservé.
          </p>
        </div>
        <Button onClick={start} disabled={!configured || starting || job.running || st.pending === 0}>
          {job.running ? <><FaSpinner className="spin" /> En cours…</> : <><FaMagic /> Améliorer les photos en attente ({Math.min(st.pending, 20)})</>}
        </Button>
      </div>
      <div className="admin-enhance-bar" aria-label={`${ratio}% des photos améliorées`}><span style={{ width: `${ratio}%` }} /></div>
      {job.running && (
        <p className="dash-sub">Lot : {job.done + job.failed} / {job.total} traitées{job.failed ? `, ${job.failed} échec(s)` : ''}. Vous pouvez quitter la page, le traitement continue.</p>
      )}
      {!job.running && job.finishedAt && job.total > 0 && (
        <p className="dash-sub">Dernier lot : {job.done} réussie(s), {job.failed} échec(s).</p>
      )}
      <p className="admin-enhance-prov">
        {configured
          ? <>Moteurs : {(st.providers || []).map((p, i) => <span key={i}>{i ? ' → ' : ''}{providerName(p)}{i ? ' (secours)' : ''}</span>)}</>
          : <><FaExclamationTriangle /> Aucun moteur configuré : renseignez OPENROUTER_API_KEY (et AZURE_OPENAI_* en secours) sur le serveur.</>}
      </p>
    </section>
  )
}

/**
 * Vignette de l'annonce : bouton flottant discret « Améliorer » si la photo ne
 * l'est pas encore ; sinon pastille ✨ qui ouvre la comparaison avant / après.
 */
export function EnhanceThumb({ item, onChanged }) {
  const api = useTindisaApi()
  const { notify } = useToast()
  const [busy, setBusy] = useState(false)
  const [compare, setCompare] = useState(false)

  const enhance = async (e) => {
    e?.stopPropagation()
    setBusy(true)
    try {
      await api.post(`/v1/admin/marketplace/listings/${item.id}/enhance`, {})
      notify(`Photo améliorée : ${item.name}`, 'success')
      onChanged?.()
    } catch (err) { notify(err?.message || 'Amélioration impossible', 'error') } finally { setBusy(false) }
  }
  const revert = async () => {
    setBusy(true)
    try {
      await api.del(`/v1/admin/marketplace/listings/${item.id}/enhance`)
      notify('Photo d’origine rétablie', 'success')
      setCompare(false)
      onChanged?.()
    } catch (err) { notify(err?.message || 'Erreur', 'error') } finally { setBusy(false) }
  }

  if (!item.image) return <span className="cat-thumb"><FaImage /></span>
  const enhanced = !!item.enhancedImage

  return (
    <>
      <span className={`cat-thumb admin-thumb${enhanced ? ' is-enhanced' : ''}`}>
        <img src={enhanced ? item.enhancedImage : item.image} alt="" />
        {enhanced ? (
          <button type="button" className="admin-thumb-badge" title="Photo améliorée : comparer" onClick={() => setCompare(true)}><FaMagic /></button>
        ) : (
          <button type="button" className={`admin-thumb-fab${busy ? ' busy' : ''}`} disabled={busy}
            title={item.enhanceStatus === 'failed' ? `Échec précédent : ${item.enhanceError || ''}. Réessayer` : 'Améliorer la netteté'}
            onClick={enhance}>
            {busy ? <FaSpinner className="spin" /> : <FaMagic />}
            {item.enhanceStatus === 'failed' && <i className="admin-thumb-fail" />}
          </button>
        )}
      </span>
      {compare && (
        <Modal open title={`Photo de « ${item.name} »`} onClose={() => setCompare(false)}>
          <div className="admin-compare">
            <figure><img src={item.image} alt="Originale" /><figcaption>Originale (conservée, visible sur la fiche)</figcaption></figure>
            <figure><img src={item.enhancedImage} alt="Améliorée" /><figcaption>Améliorée (couverture sur le marché)</figcaption></figure>
          </div>
          <div className="ui-modal-foot">
            <Button variant="ghost" onClick={revert} disabled={busy}><FaUndo /> Revenir à l’original</Button>
            <Button variant="secondary" onClick={enhance} disabled={busy}>{busy ? <FaSpinner className="spin" /> : <FaMagic />} Refaire</Button>
            <Button onClick={() => setCompare(false)}>Garder</Button>
          </div>
        </Modal>
      )}
    </>
  )
}
