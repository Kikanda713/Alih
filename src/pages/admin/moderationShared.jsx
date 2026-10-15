import { useState } from 'react'
import { FaBan, FaUndo, FaTrashAlt, FaCheck } from 'react-icons/fa'

// Constantes et utilitaires de modération (partagés par ModerationKit, AdminMarketplace, AdminP2P).
export const MOD_STATUS = {
  published: { tone: 'success', label: 'En ligne' },
  pending_review: { tone: 'info', label: 'En attente' },
  blocked: { tone: 'warn', label: 'Diffusion bloquée' },
  removed: { tone: 'danger', label: 'Supprimée' },
}

export const MOD_TABS = [
  { k: '', label: 'Toutes', count: 'total' },
  { k: 'flagged', label: 'À examiner', count: 'flagged', alert: true },
  { k: 'reported', label: 'Signalées', count: 'reported', alert: true },
  { k: 'blocked', label: 'Bloquées', count: 'blocked' },
  { k: 'removed', label: 'Supprimées', count: 'removed' },
]

// Mêmes codes que le serveur (moderation-rules.ts).
export const REASONS = [
  { id: 'illegal', label: 'Produit illicite (drogues, armes, munitions)' },
  { id: 'wildlife', label: 'Espèces protégées (ivoire, animaux, viande de brousse protégée)' },
  { id: 'minerals', label: 'Minerais ou or sans traçabilité' },
  { id: 'human', label: "Traite ou exploitation d'êtres humains" },
  { id: 'documents', label: 'Faux documents (papiers, cartes, diplômes)' },
  { id: 'medicines', label: 'Médicaments contrefaits ou sur ordonnance' },
  { id: 'counterfeit', label: 'Contrefaçon' },
  { id: 'fraud', label: 'Arnaque ou prix leurre' },
  { id: 'duplicate', label: 'Annonce en double' },
  { id: 'inappropriate', label: 'Contenu inapproprié' },
  { id: 'other', label: 'Autre motif' },
]
export const SEVERE = new Set(['illegal', 'human', 'wildlife', 'minerals'])
export const reasonLabel = (code) => REASONS.find((r) => r.id === code)?.label || code || ''

export const ACTIONS = {
  block: { label: 'Bloquer la diffusion', done: 'Diffusion bloquée', icon: <FaBan />, danger: true, needsReason: true },
  unblock: { label: 'Débloquer', done: 'Annonce remise en ligne', icon: <FaUndo /> },
  remove: { label: 'Supprimer', done: 'Annonce supprimée (données conservées)', icon: <FaTrashAlt />, danger: true, needsReason: true },
  restore: { label: 'Restaurer', done: 'Annonce restaurée', icon: <FaUndo /> },
  approve: { label: 'Examiné, RAS', done: 'Annonce examinée : rien à signaler', icon: <FaCheck /> },
}

/** Actions possibles selon le statut et l'état de la file. */
export function actionsFor(item) {
  const st = item?.status || 'published'
  const m = item?.moderation || {}
  const out = []
  if (st === 'published' || st === 'pending_review') {
    if (m.flagged || m.reports > 0 || st === 'pending_review') out.push('approve')
    out.push('block', 'remove')
  } else if (st === 'blocked') out.push('unblock', 'remove')
  else if (st === 'removed') out.push('restore')
  return out
}

/** Sélection multiple (ids) d'une page de résultats. */
export function useSelection() {
  const [ids, setIds] = useState(() => new Set())
  const toggle = (id) => setIds((s) => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    return n
  })
  const setAll = (list, on) => setIds((s) => {
    const n = new Set(s)
    for (const id of list) {
      if (on) n.add(id)
      else n.delete(id)
    }
    return n
  })
  const clear = () => setIds(new Set())
  return { ids, toggle, setAll, clear }
}

/** Message de fin d'une action (y compris le résultat d'un lot). */
export function doneMessage(action, res) {
  const base = ACTIONS[action]?.done || 'Fait'
  if (res && typeof res.done === 'number') {
    const failed = res.failed?.length || 0
    return failed ? `${base} : ${res.done} fait(s), ${failed} en échec` : `${base} (${res.done})`
  }
  return res?.sellerBlocked ? `${base}, vendeur bloqué` : base
}
