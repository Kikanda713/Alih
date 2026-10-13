import { useState } from "react";
import { FaBan, FaUserSecret } from "react-icons/fa";
import { Badge, Button, Field, Input, Modal, Textarea } from "../../components/ui.jsx";
import { REASON_MIN, WAIVE_MIN, txt } from "./certAdmin";

/*
 * Morceaux partagés du back-office de certification : badges d'état (paiement,
 * particulier, remboursement…), dispense de paiement, refus / complément,
 * révocation avec motif obligatoire.
 */

const STATE = {
  requested: { tone: "neutral", label: "En attente de paiement" },
  paid: { tone: "warn", label: "À vérifier" },
  info_requested: { tone: "warn", label: "Complément demandé" },
  rejected: { tone: "danger", label: "Refusé" },
  revoked: { tone: "danger", label: "Révoqué" },
  issued: { tone: "success", label: "Délivré" },
};

/** Badge du statut (hors « expiré », géré par l'appelant). */
export function CertStateBadge({ status, issuedLabel = "Délivré", fallback }) {
  const s = STATE[status];
  if (!s) return fallback || <Badge tone="neutral">Non certifié</Badge>;
  return <Badge tone={s.tone}>{status === "issued" ? issuedLabel : s.label}</Badge>;
}

/** Badges secondaires d'une ligne : paiement, particulier, dispense, remboursement… */
export function CertFlags({ row, showPaid = true }) {
  if (!row || typeof row !== "object") return null;
  const masked = txt(row.sellerMasked);
  return (
    <span className="admin-cert-flags">
      {showPaid && row.paid === true && <Badge tone="success">Payé</Badge>}
      {showPaid && row.paid === false && <Badge tone="neutral">Non payé</Badge>}
      {row.p2p === true && (
        <Badge tone="neutral">
          <FaUserSecret /> Particulier{masked ? ` · ${masked}` : ""}
        </Badge>
      )}
      {row.waived === true && <Badge tone="warn">Délivré sans paiement</Badge>}
      {row.refundDue && <Badge tone="danger">Remboursement à effectuer</Badge>}
      {row.updateRequested && <Badge tone="warn">Mise à jour demandée</Badge>}
    </span>
  );
}

/** Motif de la dernière décision (refus, complément, révocation). */
export function CertReason({ row, block = false }) {
  const r = txt(row?.decisionReason);
  if (!r) return null;
  if (block) return <blockquote className="procert-reason">Motif : {r}</blockquote>;
  return (
    <span className="admin-cert-reason" title={r}>
      Motif : {r.length > 90 ? `${r.slice(0, 89)}…` : r}
    </span>
  );
}

/**
 * Dispense de paiement : case « Délivrer sans paiement » + motif obligatoire.
 * `value` = { on, reason } ; n'apparaît que si `unpaid`.
 */
export function WaivePayment({ unpaid, value, onChange, label = "Délivrer sans paiement" }) {
  if (!unpaid) return null;
  const reason = String(value?.reason || "");
  return (
    <div className="admin-waive">
      <span className="dash-sub">
        Le paiement n'a pas été reçu. La délivrance est bloquée sauf dispense
        motivée.
      </span>
      <label className="cert-check">
        <input
          type="checkbox"
          checked={!!value?.on}
          onChange={(e) => onChange({ ...value, on: e.target.checked })}
        />{" "}
        {label}
      </label>
      {value?.on && (
        <Field
          label="Motif de la dispense *"
          error={
            reason.trim().length > 0 && reason.trim().length < WAIVE_MIN
              ? `${WAIVE_MIN} caractères au minimum`
              : ""
          }
        >
          <Input
            value={reason}
            maxLength={300}
            placeholder="Ex. paiement reçu en espèces au bureau de Gombe"
            onChange={(e) => onChange({ ...value, reason: e.target.value })}
          />
        </Field>
      )}
    </div>
  );
}

/** Refuser une demande ou demander un complément (motif obligatoire). */
export function RejectModal({ target, api, notify, onClose, onDone }) {
  const [mode, setMode] = useState("info");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const clean = reason.trim();
  const ok = clean.length >= REASON_MIN;

  const submit = async () => {
    if (!ok || !target?.certId) return;
    setBusy(true);
    try {
      await api.post(
        `/v1/admin/certification/cert/${encodeURIComponent(target.certId)}/reject`,
        { reason: clean, needInfo: mode === "info" },
      );
      notify(mode === "info" ? "Complément demandé" : "Demande refusée", "success");
      onDone();
    } catch (e) {
      notify(e?.message || "Erreur", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!target}
      title={target ? `Refuser ou demander un complément · ${txt(target.name)}` : ""}
      onClose={busy ? undefined : onClose}
    >
      {target && (
        <div className="product-form">
          <div className="admin-radio-group" role="radiogroup">
            <label className="admin-radio">
              <input
                type="radio"
                name="reject-mode"
                checked={mode === "info"}
                onChange={() => setMode("info")}
              />
              <span>
                <strong>Demander un complément</strong>
                <br />
                Le demandeur complète son dossier et le renvoie. Un paiement déjà
                reçu reste acquis.
              </span>
            </label>
            <label className="admin-radio">
              <input
                type="radio"
                name="reject-mode"
                checked={mode === "reject"}
                onChange={() => setMode("reject")}
              />
              <span>
                <strong>Refuser</strong>
                <br />
                La demande est rejetée. Si elle avait été payée, un remboursement
                sera à effectuer.
              </span>
            </label>
          </div>
          <Field
            label="Motif (visible par le demandeur) *"
            hint={ok ? `${clean.length}/1000` : `${REASON_MIN} caractères au minimum`}
          >
            <Textarea
              rows={4}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                mode === "info"
                  ? "Ex. merci d'ajouter une photo lisible de la facture d'achat"
                  : "Ex. le titre de propriété présenté ne correspond pas au bien"
              }
            />
          </Field>
          <div className="ui-modal-foot">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Annuler
            </Button>
            <Button
              variant={mode === "reject" ? "danger" : "primary"}
              onClick={submit}
              disabled={busy || !ok}
            >
              {busy
                ? "Envoi…"
                : mode === "info"
                  ? "Demander le complément"
                  : "Refuser la demande"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Révocation d'un certificat : motif obligatoire. */
export function RevokeModal({ target, api, notify, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const clean = reason.trim();
  const ok = clean.length >= REASON_MIN;

  const submit = async () => {
    if (!ok || !target?.certId) return;
    setBusy(true);
    try {
      await api.post(
        `/v1/admin/certification/cert/${encodeURIComponent(target.certId)}/revoke`,
        { reason: clean },
      );
      notify("Certificat révoqué", "success");
      onDone();
    } catch (e) {
      notify(e?.message || "Erreur", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!target}
      title="Révoquer le certificat"
      onClose={busy ? undefined : onClose}
    >
      {target && (
        <div className="product-form">
          <p className="ui-confirm-text">
            Révoquer le certificat de « {txt(target.name) || "ce titulaire"} » ? Il
            ne sera plus valable et son PDF public ne sera plus servi.
          </p>
          <Field
            label="Motif de la révocation (public) *"
            hint={ok ? `${clean.length}/1000` : `${REASON_MIN} caractères au minimum`}
          >
            <Textarea
              rows={3}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex. bien vendu sans mise à jour du certificat"
            />
          </Field>
          <div className="ui-modal-foot">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Annuler
            </Button>
            <Button variant="danger" onClick={submit} disabled={busy || !ok}>
              <FaBan /> {busy ? "Révocation…" : "Révoquer"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
