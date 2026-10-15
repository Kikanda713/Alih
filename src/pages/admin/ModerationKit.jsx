import { useState } from 'react'
import { useLoad } from '../../api/useLoad'
import { FaHistory, FaFlag, FaExclamationTriangle, FaTimes } from 'react-icons/fa'
import { Badge, Button, Field, Modal, Select, Spinner, Textarea } from '../../components/ui.jsx'
import { MOD_STATUS, MOD_TABS, REASONS, SEVERE, reasonLabel, ACTIONS, actionsFor } from './moderationShared.jsx'
import './moderation.css'

/*
 * Outils de modération partagés (marché web et P2P). Politique : une annonce est
 * publiée directement ; l'équipe modère ensuite. « À examiner » = filtre
 * automatique (termes à risque) ou signalements nombreux ; « Signalées » = au
 * moins un signalement de visiteur. Le serveur borne tout à la ville de l'admin.
 */

/** Termes relevés par le filtre automatique et signalements (cellule du tableau). */
export function FlagChips({ moderation }) {
  const m = moderation || {}
  if (!m.flagged && !m.reports && !m.reason) return null
  return (
    <span className="mod-chips">
      {m.flagged && m.flags?.map((f) => (
        <span key={`${f.code}:${f.term}`} className={`mod-chip${SEVERE.has(f.code) ? ' severe' : ''}`} title={reasonLabel(f.code)}>
          <FaExclamationTriangle /> {f.term}
        </span>
      ))}
      {m.reports > 0 && (
        <span className={`mod-chip${m.reportPriority ? ' severe' : ''}`} title={(m.reportCodes || []).map(reasonLabel).join(', ')}>
          <FaFlag /> {m.reports} signalement{m.reports > 1 ? 's' : ''}
        </span>
      )}
      {m.reason && !m.flagged && <span className="mod-reason">{reasonLabel(m.reasonCode)}{m.reason ? ` : ${m.reason}` : ''}</span>}
    </span>
  )
}

/** Onglets avec compteurs (badge rouge sur « À examiner » / « Signalées »). */
export function ModTabs({ value, counts = {}, onChange }) {
  return (
    <div className="cat-tabs admin-tabs">
      {MOD_TABS.map((t) => {
        const n = Number(counts[t.count] || 0)
        return (
          <button key={t.k} className={`cat-tab${value === t.k ? ' active' : ''}`} onClick={() => onChange(t.k)}>
            {t.label}
            {n > 0 && <span className={`mod-count${t.alert ? ' alert' : ''}`}>{n}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Boutons d'action d'une ligne. */
export function RowActions({ item, onAction, onHistory }) {
  return (
    <>
      {actionsFor(item).map((a) => (
        <button key={a} className={`cat-icon-btn${ACTIONS[a].danger ? ' danger' : ''}`} title={ACTIONS[a].label} aria-label={ACTIONS[a].label} onClick={() => onAction(a, [item])}>
          {ACTIONS[a].icon}
        </button>
      ))}
      <button className="cat-icon-btn" title="Historique de modération" aria-label="Historique de modération" onClick={() => onHistory(item)}><FaHistory /></button>
    </>
  )
}

/** Barre d'actions groupées (sélection multiple, 200 max côté serveur). */
export function BulkBar({ count, onAction, onClear }) {
  if (!count) return null
  return (
    <div className="mod-bulk" role="region" aria-label="Actions groupées">
      <b>{count} sélectionnée{count > 1 ? 's' : ''}</b>
      {['approve', 'block', 'unblock', 'remove', 'restore'].map((a) => (
        <Button key={a} size="sm" variant={ACTIONS[a].danger ? 'danger' : 'ghost'} onClick={() => onAction(a)}>{ACTIONS[a].label}</Button>
      ))}
      <button className="cat-icon-btn" title="Vider la sélection" aria-label="Vider la sélection" onClick={onClear}><FaTimes /></button>
    </div>
  )
}

/**
 * Fenêtre de décision : motif (code + précision) obligatoire pour bloquer ou
 * supprimer, option « Bloquer aussi le vendeur » proposée d'office pour les motifs graves.
 */
export function ModerationModal({ state, onClose, onConfirm }) {
  const { open, action, items = [], busy } = state
  const def = ACTIONS[action] || {}
  const many = items.length > 1
  return (
    <Modal open={open} title={many ? `${def.label} (${items.length} annonces)` : def.label || ''} onClose={busy ? undefined : onClose}>
      {open && (
        <ModerationForm
          key={`${action}:${items.map((i) => i.id).join(',')}`}
          action={action}
          items={items}
          busy={busy}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      )}
    </Modal>
  )
}

function ModerationForm({ action, items, busy, onClose, onConfirm }) {
  const def = ACTIONS[action] || {}
  const first = items[0]
  const suggested = def.needsReason ? first?.moderation?.flags?.[0]?.code || '' : ''
  const [code, setCode] = useState(suggested)
  const [text, setText] = useState('')
  const [alsoSeller, setAlsoSeller] = useState(action === 'remove' && SEVERE.has(suggested))
  const missing = def.needsReason && (!code || (code === 'other' && !text.trim()))
  const sellerLabel = items.every((i) => i.isP2P)
    ? 'Bloquer aussi le numéro du vendeur (plus aucune annonce P2P)'
    : 'Bloquer aussi le vendeur (établissement entier)'

  return (
    <>
      <p className="ui-confirm-text">
        {items.length > 1 ? `${items.length} annonces sélectionnées.` : first ? `« ${first.name} »` : ''}
        {action === 'block' && ' Elle ne sera plus visible (site, assistant, partages), le vendeur est prévenu avec le motif.'}
        {action === 'remove' && ' Elle disparaît partout, y compris du catalogue du vendeur. Les données restent conservées comme preuves.'}
        {action === 'approve' && ' Le signalement est levé, l’annonce reste en ligne.'}
        {(action === 'unblock' || action === 'restore') && ' Elle redevient visible et le vendeur est prévenu.'}
      </p>
      {def.needsReason && (
        <>
          <Field label="Motif">
            <Select value={code} onChange={(e) => {
              setCode(e.target.value)
              if (SEVERE.has(e.target.value) && action === 'remove') setAlsoSeller(true)
            }} options={REASONS} placeholder="Choisir un motif" />
          </Field>
          <Field label="Précision" hint="Envoyée au vendeur avec le motif. Obligatoire pour « Autre motif ».">
            <Textarea rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          <label className="mod-check">
            <input type="checkbox" checked={alsoSeller} onChange={(e) => setAlsoSeller(e.target.checked)} />
            <span>{sellerLabel}</span>
          </label>
          {SEVERE.has(code) && !alsoSeller && <p className="mod-hint"><FaExclamationTriangle /> Motif grave : bloquer aussi le vendeur est recommandé.</p>}
        </>
      )}
      <div className="ui-modal-foot">
        <Button variant="ghost" onClick={onClose} disabled={busy}>Annuler</Button>
        <Button variant={def.danger ? 'danger' : 'primary'} disabled={busy || missing}
          onClick={() => onConfirm({ action, reasonCode: code || undefined, reasonText: text.trim() || undefined, alsoBlockSeller: !!alsoSeller })}>
          {busy ? 'En cours…' : def.label}
        </Button>
      </div>
    </>
  )
}

const LOG_LABEL = {
  block: 'Diffusion bloquée',
  unblock: 'Débloquée',
  remove: 'Supprimée',
  restore: 'Restaurée',
  approve: 'Examinée, RAS',
  hold: 'Mise en attente',
  auto_flag: 'Signalée par le filtre automatique',
  report_threshold: 'Seuil de signalements atteint',
  owner_delete: 'Retirée par le vendeur',
  purge: 'Purgée',
}
const when = (d) => (d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '')

/** Historique de modération d'une annonce (actions, motifs, signalements anonymes). */
export function ModerationHistory({ item, load, onClose }) {
  const { data, loading } = useLoad(
    () => (item ? load(item).catch(() => ({ log: [], reports: [] })) : Promise.resolve(null)),
    [item?.id || null],
  )
  const ready = !loading && data && item

  return (
    <Modal open={!!item} wide title={item ? `Historique : ${item.name}` : ''} onClose={onClose}>
      {!ready ? <Spinner label="Chargement…" /> : (
        <div className="mod-history">
          {item?.moderation?.flags?.length > 0 && (
            <section>
              <h4>Termes relevés</h4>
              <FlagChips moderation={{ ...item.moderation, reports: 0, reason: null, flagged: true }} />
            </section>
          )}
          <section>
            <h4>Décisions</h4>
            {!data.log?.length ? <p className="dash-sub">Aucune action enregistrée.</p> : (
              <ol className="mod-log">
                {data.log.map((l) => (
                  <li key={l.id}>
                    <b>{LOG_LABEL[l.action] || l.action}</b>
                    {l.to && l.from !== l.to && <Badge tone={MOD_STATUS[l.to]?.tone || 'neutral'}>{MOD_STATUS[l.to]?.label || l.to}</Badge>}
                    <small>{when(l.at)}{l.actor ? ` · ${l.actor}` : ''}{l.actorCity ? ` · ${l.actorCity}` : ''}</small>
                    {(l.reasonLabel || l.reasonText) && <span className="mod-reason">{[l.reasonLabel, l.reasonText].filter(Boolean).join(' : ')}</span>}
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section>
            <h4>Signalements des visiteurs</h4>
            {!data.reports?.length ? <p className="dash-sub">Aucun signalement.</p> : (
              <ol className="mod-log">
                {data.reports.map((r, i) => (
                  <li key={i}>
                    <b>{reasonLabel(r.reasonCode)}</b>
                    {r.resolved && <Badge tone="neutral">Traité</Badge>}
                    <small>{when(r.at)}</small>
                    {r.text && <span className="mod-reason">{r.text}</span>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
    </Modal>
  )
}
