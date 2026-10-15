import { useState } from 'react'
import { FaFlag } from 'react-icons/fa'
import { Button, Field, Modal, Select, Textarea } from '../../components/ui'
import { useToast } from '../../components/useToast'
import { marketApi } from '../lib/api'

// Motifs proposés au public (mêmes codes que la modération côté serveur).
const REASONS = [
  { id: 'illegal', label: 'Produit interdit (drogue, arme, munitions)' },
  { id: 'wildlife', label: 'Ivoire ou animal protégé' },
  { id: 'minerals', label: 'Or ou minerais sans traçabilité' },
  { id: 'human', label: 'Exploitation ou vente de personnes' },
  { id: 'documents', label: 'Faux papiers ou diplômes' },
  { id: 'medicines', label: 'Médicaments douteux ou sur ordonnance' },
  { id: 'counterfeit', label: 'Contrefaçon' },
  { id: 'fraud', label: 'Arnaque ou prix trop beau pour être vrai' },
  { id: 'duplicate', label: 'Annonce en double' },
  { id: 'inappropriate', label: 'Contenu choquant ou inapproprié' },
  { id: 'other', label: 'Autre problème' },
]

/**
 * « Signaler cette annonce » : sans compte, anonyme pour le vendeur. L'annonce
 * reste en ligne ; l'équipe Tindisa l'examine (plus vite si plusieurs personnes signalent).
 */
export default function ReportListing({ id }) {
  const { notify } = useToast()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const close = () => { if (!busy) setOpen(false) }
  const submit = async () => {
    setBusy(true)
    try {
      await marketApi.report(id, { reasonCode: reason, text: text.trim() || undefined })
      setSent(true)
      setOpen(false)
      notify('Merci, l’équipe Tindisa va examiner cette annonce.', 'success', 4000)
    } catch (e) {
      notify(e?.status === 429 ? 'Trop de signalements, réessayez plus tard.' : 'Signalement impossible pour le moment, réessayez.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" className="mk-report-link" onClick={() => setOpen(true)} disabled={sent}>
        <FaFlag /> {sent ? 'Annonce signalée, merci' : 'Signaler cette annonce'}
      </button>
      <Modal open={open} title="Signaler cette annonce" onClose={close}>
        <p className="ui-confirm-text">
          Votre signalement est anonyme pour le vendeur. L’équipe Tindisa examine l’annonce et la retire si elle enfreint les règles.
        </p>
        <Field label="Quel est le problème ?">
          <Select value={reason} onChange={(e) => setReason(e.target.value)} options={REASONS} placeholder="Choisir un motif" />
        </Field>
        <Field label="Précision (facultatif)">
          <Textarea rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ce qui vous semble anormal" />
        </Field>
        <div className="ui-modal-foot">
          <Button variant="ghost" onClick={close} disabled={busy}>Annuler</Button>
          <Button variant="danger" onClick={submit} disabled={busy || !reason}>{busy ? 'Envoi…' : 'Envoyer le signalement'}</Button>
        </div>
      </Modal>
    </>
  )
}
