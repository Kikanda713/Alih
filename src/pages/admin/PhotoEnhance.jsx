import { useEffect, useRef, useState } from 'react'
import { useLoad } from '../../api/useLoad'
import { FaMagic, FaImage, FaUndo, FaExclamationTriangle, FaSpinner, FaCheck } from 'react-icons/fa'
import PhotoEnhanceModal from '../../components/PhotoEnhanceModal.jsx'
import { MODE_LABEL } from '../../components/photoModes.js'
import { useTindisaApi } from '../../api/client'
import { useToast } from '../../components/useToast'
import { Button } from '../../components/ui.jsx'

/*
 * Photos produit au format e-commerce : mode Studio (fond blanc, produit
 * redressé et centré) ou Scène (décor réel pour véhicules, immobilier…), fidèle
 * au produit d'origine. La version améliorée devient la COUVERTURE sur le
 * marché ; l'original reste conservé et visible sur la fiche. Réversible.
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
export function EnhancePanel({ withParams, onProgress, onShowProposed }) {
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
            {st.enhanced} améliorée{st.enhanced > 1 ? 's' : ''} sur {st.withPhoto} ({ratio}%). Format e-commerce : fond blanc et produit
            centré (Studio), ou décor réel corrigé pour véhicules et immobilier (Scène). Le produit, ses couleurs et ses inscriptions
            ne changent pas ; l’original est conservé.
            {st.autoEnabled && ' Les nouvelles photos sont traitées automatiquement.'}
          </p>
        </div>
        <Button onClick={start} disabled={starting || job.running || st.pending === 0}>
          {job.running ? <><FaSpinner className="spin" /> En cours…</> : <><FaMagic /> Améliorer les photos en attente ({Math.min(st.pending, 20)})</>}
        </Button>
      </div>
      {st.proposed > 0 && (
        <p className="admin-enhance-todo">
          <span className="admin-enhance-count">{st.proposed}</span> Photos améliorées à valider : retouches IA non publiées tant qu’un admin ou le commerçant ne les accepte pas.
          {onShowProposed && <Button variant="ghost" size="sm" onClick={onShowProposed}>Voir</Button>}
        </p>
      )}
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
          : <><FaExclamationTriangle /> Aucun moteur IA configuré (Réglages IA) : seule une retouche de base est appliquée (cadrage, lumière).</>}
        {configured && !st.sceneAi && <span> · Scènes (véhicules, immobilier) : retouche de base, sans IA.</span>}
      </p>
    </section>
  )
}


/**
 * Vignette de l'annonce : bouton flottant discret « Améliorer » si la photo ne
 * l'est pas encore ; sinon pastille qui ouvre l'avant / après (mode, choix de
 * la photo affichée, nouvel essai Studio ou Scène).
 */
export function EnhanceThumb({ item, onChanged }) {
  const api = useTindisaApi()
  const { notify } = useToast()
  const [busy, setBusy] = useState(false)
  const [compare, setCompare] = useState(false)
  const base = `/v1/admin/marketplace/listings/${item.id}/enhance`

  const enhance = async (e) => {
    e?.stopPropagation()
    setBusy(true)
    try {
      await api.post(base, {})
      notify(`Photo améliorée : ${item.name}`, 'success')
      onChanged?.()
      setCompare(true)
    } catch (err) { notify(err?.message || 'Amélioration impossible', 'error') } finally { setBusy(false) }
  }

  if (!item.image) return <span className="cat-thumb"><FaImage /></span>
  const enhanced = !!item.enhancedImage
  const proposed = !enhanced && !!item.enhancedCandidate && item.enhanceStatus === 'proposed'
  const candidate = proposed || (!enhanced && !!item.enhancedCandidate && item.enhanceStatus === 'rejected')

  return (
    <>
      <span className={`cat-thumb admin-thumb${enhanced ? ' is-enhanced' : ''}`}>
        <img src={enhanced ? item.enhancedImage : item.image} alt="" />
        {enhanced || candidate ? (
          <button type="button" className="admin-thumb-badge"
            title={enhanced ? `Photo améliorée (${MODE_LABEL[item.enhanceMode] || 'auto'}) : comparer` : proposed ? 'Photo améliorée à valider' : 'Originale gardée : voir la version améliorée'}
            onClick={() => setCompare(true)}>
            {enhanced ? <FaMagic /> : proposed ? <FaCheck /> : <FaUndo />}
            {proposed && <i className="admin-thumb-fail admin-thumb-todo" />}
          </button>
        ) : (
          <button type="button" className={`admin-thumb-fab${busy ? ' busy' : ''}`} disabled={busy}
            title={item.enhanceStatus === 'failed' ? `Échec précédent : ${item.enhanceError || ''}. Réessayer` : 'Mettre au format e-commerce'}
            onClick={enhance}>
            {busy ? <FaSpinner className="spin" /> : <FaMagic />}
            {item.enhanceStatus === 'failed' && <i className="admin-thumb-fail" />}
          </button>
        )}
      </span>
      {compare && (
        <PhotoEnhanceModal open title={`Photo de « ${item.name} »`} onClose={() => setCompare(false)} onChanged={onChanged}
          endpoints={{ state: base, enhance: base, accept: `${base}/accept`, revert: base }} />
      )}
    </>
  )
}
