import { useMemo, useState } from 'react'
import { useLoad } from '../../api/useLoad'
import { FaRobot, FaKey, FaCheckCircle, FaExclamationTriangle, FaSave, FaPlug, FaMagic, FaComments } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useToast } from '../../components/useToast'
import { Badge, Button, Card, EmptyState, Field, Input, Select, Spinner } from '../../components/ui.jsx'

/*
 * Réglages IA (admins globaux) :
 *  - jetons des fournisseurs : OpenRouter (un seul jeton pour tous les modèles)
 *    et Azure OpenAI (secours quand les crédits sont épuisés). Saisis ici,
 *    chiffrés côté serveur, jamais réaffichés en clair ;
 *  - pour chaque tâche : fournisseur + modèle principal, puis secours.
 */

const PROVIDERS = [
  { id: 'openrouter', label: 'OpenRouter' },
  { id: 'azure', label: 'Azure OpenAI' },
]
const TASK_ICONS = { agent_chat: <FaComments />, image_enhance: <FaMagic /> }
const usd = (v) => (v == null ? '·' : `${Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 4 })} $`)

const price = (m, output) => {
  if (m.kind) return m.kind === 'deployment' ? '' : 'nom du déploiement = nom du modèle'
  if (output === 'image') return m.imagePrice != null ? `${usd(m.imagePrice)} / image` : ''
  return m.promptPrice != null ? `${usd(m.promptPrice)} / ${usd(m.completionPrice)} par M jetons` : ''
}
const vendorOf = (m) => (m.kind
  ? (m.kind === 'deployment' ? 'Déploiements de la ressource' : 'Modèles de la ressource')
  : (m.id.split('/')[0] || 'autres'))

/**
 * Liste déroulante des modèles À JOUR d'un fournisseur : catalogue OpenRouter
 * (filtré par type de sortie) ou déploiements de la ressource Azure. Regroupés
 * par éditeur, avec un champ de filtre pour les longues listes.
 */
function ModelSelect({ provider, output, value, onChange }) {
  const api = useTindisaApi()
  const [q, setQ] = useState('')
  const { data: models, error, loading } = useLoad(
    () => api.get(`/v1/admin/ai/models?provider=${provider}&output=${output}`).then((m) => (Array.isArray(m) ? m : [])),
    [provider, output],
  )

  const groups = useMemo(() => {
    const n = q.trim().toLowerCase()
    const map = new Map()
    for (const m of models || []) {
      if (n && !`${m.id} ${m.name} ${m.model || ''}`.toLowerCase().includes(n) && m.id !== value) continue
      const g = vendorOf(m)
      if (!map.has(g)) map.set(g, [])
      map.get(g).push(m)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [models, q, value])

  if (loading) return <Spinner label="Modèles…" />
  if (error) return <p className="mk-form-error">{error.message || 'Liste des modèles indisponible'}</p>
  const current = (models || []).find((m) => m.id === value)
  const count = groups.reduce((n, [, l]) => n + l.length, 0)

  return (
    <div className="admin-ai-model">
      {(models?.length || 0) > 12 && (
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer : claude, gpt, gemini…" aria-label="Filtrer les modèles" />
      )}
      <select className="ui-input ui-select" value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">{count ? `Choisir parmi ${count} modèle${count > 1 ? 's' : ''}…` : 'Aucun modèle disponible'}</option>
        {value && !current && <option value={value}>{value} (actuel, absent du catalogue)</option>}
        {groups.map(([g, list]) => (
          <optgroup key={g} label={g}>
            {list.map((m) => (
              <option key={m.id} value={m.id}>
                {[m.name, price(m, output), output === 'text' && m.tools ? 'outils' : ''].filter(Boolean).join(' · ')}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {provider === 'azure' && !models?.length && <small className="dash-sub">Aucun déploiement trouvé : vérifiez l’endpoint et la clé Azure.</small>}
      {output === 'text' && current && current.tools === false && (
        <small className="mk-form-error">Ce modèle ne gère pas les outils : l’assistant ne pourra ni chercher ni commander.</small>
      )}
    </div>
  )
}

function ChoiceRow({ label, output, choice, onChange, allowEmpty, providers }) {
  const provider = choice?.provider || ''
  return (
    <div className="admin-ai-choice">
      <span className="admin-ai-choice-label">{label}</span>
      <Select value={provider} onChange={(e) => onChange(e.target.value ? { provider: e.target.value, model: '' } : null)}
        options={PROVIDERS.map((p) => ({ ...p, label: `${p.label}${providers[p.id]?.configured ? '' : ' (non configuré)'}` }))}
        placeholder={allowEmpty ? 'Aucun' : 'Choisir…'} />
      {provider && (providers[provider]?.configured
        ? <ModelSelect provider={provider} output={output} value={choice?.model} onChange={(model) => onChange({ provider, model })} />
        : <small className="dash-sub">Enregistrez d’abord la clé de ce fournisseur.</small>)}
    </div>
  )
}

function TaskCard({ task, providers, onSaved }) {
  const api = useTindisaApi()
  const { notify } = useToast()
  const [primary, setPrimary] = useState(task.primary)
  const [fallback, setFallback] = useState(task.fallback)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(primary) !== JSON.stringify(task.primary) || JSON.stringify(fallback) !== JSON.stringify(task.fallback)

  const save = async () => {
    if (!primary?.provider || !primary?.model) return notify('Choisissez le fournisseur et le modèle principal', 'error')
    setSaving(true)
    try { onSaved(await api.put(`/v1/admin/ai/tasks/${task.id}`, { primary, fallback })); notify(`${task.label} : réglage enregistré`, 'success') }
    catch (e) { notify(e?.message || 'Erreur', 'error') } finally { setSaving(false) }
  }

  return (
    <Card className="admin-ai-task">
      <div className="admin-ai-task-head">
        <span className="admin-enhance-ic">{TASK_ICONS[task.id] || <FaRobot />}</span>
        <div>
          <h3>{task.label}</h3>
          <p className="dash-sub">{task.description}</p>
        </div>
      </div>
      <ChoiceRow label="Principal" output={task.output} choice={primary} onChange={setPrimary} providers={providers} />
      <ChoiceRow label="Secours" output={task.output} choice={fallback} onChange={setFallback} allowEmpty providers={providers} />
      <p className="dash-sub">Le secours prend le relais automatiquement si le principal échoue (crédits épuisés, quota atteint, panne).</p>
      <div className="ui-modal-foot">
        <Button onClick={save} disabled={!dirty || saving}><FaSave /> {saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
      </div>
    </Card>
  )
}

function ProviderCard({ id, info, onSaved }) {
  const api = useTindisaApi()
  const { notify } = useToast()
  const [key, setKey] = useState('')
  const [endpoint, setEndpoint] = useState(info.endpoint || '')
  const [apiVersion, setApiVersion] = useState(info.apiVersion || '2025-04-01-preview')
  const [saving, setSaving] = useState(false)
  const [test, setTest] = useState(null)

  const save = async () => {
    setSaving(true)
    const body = id === 'openrouter'
      ? { openrouter: { apiKey: key } }
      : { azure: { apiKey: key, endpoint, apiVersion } }
    try { onSaved(await api.put('/v1/admin/ai/credentials', body)); setKey(''); notify('Identifiants enregistrés (chiffrés)', 'success') }
    catch (e) { notify(e?.message || 'Erreur', 'error') } finally { setSaving(false) }
  }
  const runTest = async () => {
    setTest({ loading: true })
    try { setTest(await api.post(`/v1/admin/ai/test/${id}`, {})) } catch (e) { setTest({ ok: false, error: e?.message }) }
  }

  return (
    <Card className="admin-ai-provider">
      <div className="admin-ai-task-head">
        <span className="admin-enhance-ic"><FaKey /></span>
        <div>
          <h3>{id === 'openrouter' ? 'OpenRouter' : 'Azure OpenAI'} {info.configured ? <Badge tone="success">Configuré</Badge> : <Badge tone="warn">À configurer</Badge>}</h3>
          <p className="dash-sub">
            {id === 'openrouter'
              ? 'Un seul jeton donne accès à tous les modèles (Claude, GPT, Gemini, Llama…). Fournisseur principal.'
              : 'Secours automatique quand les crédits OpenRouter sont épuisés.'}
            {info.source === 'env' && ' Actuellement lu depuis la configuration serveur.'}
          </p>
        </div>
      </div>
      {id === 'azure' && (
        <div className="mk-form-row">
          <Field label="Endpoint"><Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://ma-ressource.openai.azure.com" /></Field>
          <Field label="Version d’API"><Input value={apiVersion} onChange={(e) => setApiVersion(e.target.value)} /></Field>
        </div>
      )}
      <Field label={id === 'openrouter' ? 'Jeton OpenRouter' : 'Clé API Azure'} hint={info.apiKeyMasked ? `Actuel : ${info.apiKeyMasked}. Laissez vide pour le conserver.` : 'Collez la clé : elle sera chiffrée.'}>
        <Input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder={id === 'openrouter' ? 'sk-or-v1-…' : '••••••••'} />
      </Field>
      {test && !test.loading && (
        <p className={test.ok ? 'mk-ok' : 'mk-form-error'}>
          {test.ok ? <FaCheckCircle /> : <FaExclamationTriangle />}{' '}
          {test.ok
            ? (id === 'openrouter'
              ? `Jeton valide${test.label ? ` (${test.label})` : ''} · consommé : ${usd(test.usage)}${test.limit != null ? ` · reste : ${usd(test.limitRemaining)} sur ${usd(test.limit)}` : ' · sans plafond'}`
              : 'Connexion Azure OK')
            : test.error}
        </p>
      )}
      <div className="ui-modal-foot">
        <Button variant="ghost" onClick={runTest} disabled={!info.configured || test?.loading}><FaPlug /> {test?.loading ? 'Test…' : 'Tester'}</Button>
        <Button onClick={save} disabled={saving || (!key && id === 'openrouter')}><FaSave /> Enregistrer</Button>
      </div>
    </Card>
  )
}

export default function AdminAI() {
  const api = useTindisaApi()
  const q = useLoad(() => api.get('/v1/admin/ai'), [])
  const state = { loading: q.loading && !q.data, data: q.data, error: q.error }
  const onSaved = q.setData

  if (state.loading) return <div className="dash-page"><Spinner label="Chargement…" /></div>
  if (!state.data) {
    return (
      <div className="dash-page">
        <EmptyState icon={<FaRobot />} title={state.error?.status === 403 ? 'Réservé aux administrateurs globaux' : 'Réglages indisponibles'}
          text={state.error?.status === 403 ? 'Les jetons IA engagent la facturation de Tindisa.' : state.error?.message} />
      </div>
    )
  }
  const { providers, tasks, agentSync } = state.data

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <h1 className="dash-h1"><FaRobot style={{ marginRight: 8 }} />Réglages IA</h1>
        <p className="dash-sub">Fournisseurs, jetons et modèle utilisé pour chaque tâche. Les jetons sont chiffrés et jamais réaffichés.</p>
      </header>
      <Card className="admin-ai-sync">
        <FaComments />
        {agentSync ? (
          <span>
            Assistant WhatsApp / Telegram : <b>{agentSync.primary || '·'}</b>
            {agentSync.fallbacks?.length ? <> · secours : {agentSync.fallbacks.join(', ')}</> : null}
            {' '}{agentSync.ok
              ? (agentSync.upToDate ? <Badge tone="success">À jour</Badge> : <Badge tone="warn">Nouveau réglage en cours d’application (≤ 5 min)</Badge>)
              : <Badge tone="danger">Échec : {agentSync.error}</Badge>}
            <small> · {new Date(agentSync.at).toLocaleString('fr-FR')}</small>
          </span>
        ) : (
          <span>Assistant : modèle actuel du serveur. Le choix ci-dessous s’applique automatiquement dans les 5 minutes, sans couper WhatsApp.</span>
        )}
      </Card>
      <h2 className="admin-ai-h2">Fournisseurs</h2>
      <div className="admin-ai-grid">
        <ProviderCard key={`or-${providers.openrouter.apiKeyMasked}`} id="openrouter" info={providers.openrouter} onSaved={onSaved} />
        <ProviderCard key={`az-${providers.azure.apiKeyMasked}-${providers.azure.endpoint}`} id="azure" info={providers.azure} onSaved={onSaved} />
      </div>
      <h2 className="admin-ai-h2">Tâches</h2>
      <div className="admin-ai-grid">
        {tasks.map((t) => <TaskCard key={`${t.id}-${JSON.stringify(t.primary)}-${JSON.stringify(t.fallback)}`} task={t} providers={providers} onSaved={onSaved} />)}
      </div>
    </div>
  )
}
