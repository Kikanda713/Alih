import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaRobot, FaKey, FaCheckCircle, FaExclamationTriangle, FaSave, FaPlug, FaSearch, FaMagic, FaComments } from 'react-icons/fa'
import { useTindisaApi } from '../../api/client'
import { useToast } from '../../components/Toast.jsx'
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner } from '../../components/ui.jsx'

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

/** Sélecteur de modèle OpenRouter (catalogue filtré par type de sortie, recherche). */
function ModelPicker({ output, value, onPick, onClose }) {
  const api = useTindisaApi()
  const [q, setQ] = useState('')
  const [models, setModels] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    api.get(`/v1/admin/ai/openrouter/models?output=${output}`)
      .then((m) => alive && setModels(Array.isArray(m) ? m : []))
      .catch((e) => alive && setError(e?.message || 'Catalogue indisponible'))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [output])

  const list = useMemo(() => {
    const n = q.trim().toLowerCase()
    return (models || []).filter((m) => !n || `${m.id} ${m.name}`.toLowerCase().includes(n)).slice(0, 120)
  }, [models, q])

  return (
    <Modal open title={output === 'image' ? 'Modèles OpenRouter (image)' : 'Modèles OpenRouter (texte)'} onClose={onClose}>
      <div className="admin-ai-picker">
        <div className="admin-mk-search">
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher : claude, gpt, gemini, llama…" />
          <FaSearch />
        </div>
        {error ? <p className="mk-form-error">{error}</p> : !models ? <Spinner label="Catalogue…" /> : (
          <ul className="admin-ai-models">
            {list.map((m) => (
              <li key={m.id}>
                <button type="button" className={m.id === value ? 'active' : ''} onClick={() => onPick(m.id)}>
                  <span><b>{m.name}</b><small>{m.id}</small></span>
                  <span className="admin-ai-price">
                    {output === 'image' && m.imagePrice != null
                      ? <>{usd(m.imagePrice)} / image</>
                      : <>{usd(m.promptPrice)} / {usd(m.completionPrice)} <small>par M jetons</small></>}
                    {output === 'text' && m.tools && <Badge tone="success">outils</Badge>}
                  </span>
                </button>
              </li>
            ))}
            {!list.length && <li className="dash-sub">Aucun modèle ne correspond.</li>}
          </ul>
        )}
      </div>
    </Modal>
  )
}

function ChoiceRow({ label, output, choice, onChange, allowEmpty, providers }) {
  const [picker, setPicker] = useState(false)
  const provider = choice?.provider || ''
  return (
    <div className="admin-ai-choice">
      <span className="admin-ai-choice-label">{label}</span>
      <Select value={provider} onChange={(e) => onChange(e.target.value ? { provider: e.target.value, model: '' } : null)}
        options={PROVIDERS.map((p) => ({ ...p, label: `${p.label}${providers[p.id]?.configured ? '' : ' (non configuré)'}` }))}
        placeholder={allowEmpty ? 'Aucun' : 'Choisir…'} />
      {provider === 'openrouter' && (
        <button type="button" className="admin-ai-model-btn" onClick={() => setPicker(true)}>
          {choice?.model || 'Choisir un modèle…'}
        </button>
      )}
      {provider === 'azure' && (
        <Input value={choice?.model || ''} onChange={(e) => onChange({ provider, model: e.target.value })}
          placeholder={output === 'image' ? 'Déploiement (ex. gpt-image-1)' : 'Déploiement (ex. gpt-4.1)'} />
      )}
      {picker && <ModelPicker output={output} value={choice?.model} onClose={() => setPicker(false)}
        onPick={(id) => { onChange({ provider, model: id }); setPicker(false) }} />}
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
  const [state, setState] = useState({ loading: true, data: null, error: null })

  const load = useCallback(async () => {
    try { setState({ loading: false, data: await api.get('/v1/admin/ai'), error: null }) }
    catch (e) { setState({ loading: false, data: null, error: e }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { load() }, [load])
  const onSaved = (data) => setState({ loading: false, data, error: null })

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
