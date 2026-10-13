import { useState } from "react";
import {
  FaBan,
  FaCertificate,
  FaCheckCircle,
  FaClock,
  FaCreditCard,
  FaEdit,
  FaExclamationTriangle,
  FaLink,
  FaRedo,
  FaTimesCircle,
} from "react-icons/fa";
import { Badge, Button, Field, Modal, Textarea } from "../../components/ui.jsx";
import { assetCertState, decisionReasonOf, textOf } from "./certCommon";

/*
 * Certificat de valeur (actifs) côté catalogue du commerçant : cellule d'état
 * dans le tableau, fiche « où en est ma demande » et demande de mise à jour.
 *
 * Statuts : requested (en attente de paiement) → paid (payé, vérification par
 * l'équipe) → issued | rejected | info_requested ; revoked.
 */


const CELL = {
  requested: { cls: "pending", icon: <FaCreditCard />, label: "En attente de paiement" },
  paid: { cls: "review", icon: <FaClock />, label: "Payé, vérification Tindisa" },
  info_requested: { cls: "warn", icon: <FaExclamationTriangle />, label: "Complément demandé" },
  rejected: { cls: "bad", icon: <FaTimesCircle />, label: "Refusé" },
  revoked: { cls: "bad", icon: <FaBan />, label: "Révoqué" },
};

const short = (s, n = 60) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

// Cellule certification : discrète, n'apparaît que pour les actifs éligibles
// ou déjà engagés dans une démarche.
export function CertCell({ p, cert, eligible, onView, onRequest, onState }) {
  const st = assetCertState(cert);
  if (st === "issued") {
    return (
      <span className="cat-cert-state">
        <button
          className="cat-cert-badge ok"
          title="Voir le certificat"
          onClick={() => onView(cert)}
        >
          <FaCheckCircle /> Certifié
        </button>
        {cert?.updateRequested && (
          <span className="cat-cert-reason">Mise à jour demandée</span>
        )}
      </span>
    );
  }
  const c = CELL[st];
  if (c) {
    const reason = decisionReasonOf(cert);
    return (
      <span className="cat-cert-state">
        <button
          className={`cat-cert-badge ${c.cls}`}
          title="Voir l'état de la demande"
          onClick={() => onState(p, cert)}
        >
          {c.icon} {c.label}
        </button>
        {reason && st !== "paid" && st !== "requested" && (
          <span className="cat-cert-reason" title={reason}>
            {short(reason)}
          </span>
        )}
      </span>
    );
  }
  if (!eligible) return <span className="cat-cert-dash">·</span>;
  return (
    <button className="cat-cert-req" onClick={() => onRequest(p)}>
      <FaCertificate /> Certifier
    </button>
  );
}

const STATE_TEXT = {
  requested: {
    badge: <Badge tone="warn">En attente de paiement</Badge>,
    text: "Votre demande est enregistrée. Réglez les frais de certification pour que l'équipe Tindisa inspecte l'actif puis délivre le certificat.",
  },
  paid: {
    badge: <Badge tone="success">Payé</Badge>,
    text: "Paiement reçu. L'équipe Tindisa vérifie l'actif puis délivre le certificat. Vous serez prévenu par message.",
  },
  info_requested: {
    badge: <Badge tone="warn">Complément demandé</Badge>,
    text: "L'équipe Tindisa a besoin d'informations supplémentaires. Complétez l'annonce (photos, description, documents) puis renvoyez la demande. Si vous avez déjà payé, vous n'aurez rien à repayer.",
  },
  rejected: {
    badge: <Badge tone="danger">Refusé</Badge>,
    text: "La certification a été refusée. Vous pouvez corriger l'annonce puis soumettre de nouveau la demande.",
  },
  revoked: {
    badge: <Badge tone="danger">Révoqué</Badge>,
    text: "Ce certificat a été révoqué et n'est plus valable. Vous pouvez demander une nouvelle certification.",
  },
};

/** Fiche d'état d'une demande de certification d'actif, avec l'étape suivante. */
export function AssetCertStateModal({
  state,
  onClose,
  onPay,
  onCopyPayLink,
  onEditProduct,
  onResubmit,
  amount,
}) {
  const [busy, setBusy] = useState(false);
  const product = state?.product;
  const cert = state?.cert;
  const st = assetCertState(cert);
  const info = STATE_TEXT[st];
  const reason = decisionReasonOf(cert);
  const canResubmit = st === "info_requested" || st === "rejected" || st === "revoked";

  const resubmit = async () => {
    setBusy(true);
    try {
      await onResubmit(product, cert);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!state}
      title={product ? `Certification · ${textOf(product.name) || "Actif"}` : ""}
      onClose={busy ? undefined : onClose}
    >
      {state && info && (
        <div className="cert-state-panel">
          <div className="procert-status-head">
            {info.badge}
            {st !== "requested" && st !== "paid" && cert?.paid === true && (
              <Badge tone="success">Payé</Badge>
            )}
            {textOf(cert?.serial) && (
              <span className="procert-serial">{textOf(cert.serial)}</span>
            )}
          </div>
          {reason && st !== "requested" && st !== "paid" && (
            <blockquote className="procert-reason">
              {st === "revoked" ? "Motif : " : ""}
              {reason}
            </blockquote>
          )}
          <p className="dash-sub">{info.text}</p>
          <div className="ui-modal-foot procert-foot">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Fermer
            </Button>
            {st === "requested" && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => onCopyPayLink(product.id)}
                  disabled={busy}
                >
                  <FaLink /> Copier le lien de paiement
                </Button>
                <Button variant="primary" onClick={() => onPay(product)} disabled={busy}>
                  <FaCreditCard /> Payer{amount ? ` ${amount}` : ""}
                </Button>
              </>
            )}
            {canResubmit && st !== "revoked" && (
              <Button variant="ghost" onClick={() => onEditProduct(product)} disabled={busy}>
                <FaEdit /> Modifier l'annonce
              </Button>
            )}
            {canResubmit && (
              <Button variant="primary" onClick={resubmit} disabled={busy}>
                <FaRedo />{" "}
                {busy
                  ? "Envoi…"
                  : st === "revoked"
                    ? "Demander une nouvelle certification"
                    : "Renvoyer la demande"}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Demande de mise à jour d'un certificat délivré : note pour l'équipe, puis paiement. */
export function UpdateRequestModal({ cert, amount, onClose, onSubmit }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const clean = note.trim();

  const submit = async () => {
    if (clean.length < 5) return;
    setBusy(true);
    try {
      await onSubmit(cert, clean);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!cert}
      title="Demander une mise à jour"
      onClose={busy ? undefined : onClose}
    >
      {cert && (
        <div className="product-form">
          <p className="dash-sub">
            Indiquez ce qui a changé (nouveau propriétaire, état, valeur,
            documents…). L'équipe Tindisa vérifie puis délivre une nouvelle
            version du certificat
            {textOf(cert.serial) ? ` ${textOf(cert.serial)}` : ""}.
            {amount ? ` La mise à jour coûte ${amount}.` : ""}
          </p>
          <Field
            label="Ce qui a changé"
            hint={clean.length < 5 ? "5 caractères au minimum" : `${clean.length}/1000`}
          >
            <Textarea
              rows={4}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex. vendu à M. Kabeya le 2 octobre, nouvelle facture jointe à l'annonce"
            />
          </Field>
          <div className="ui-modal-foot">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={submit}
              disabled={busy || clean.length < 5}
            >
              {busy ? "Envoi…" : "Envoyer et payer la mise à jour"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
