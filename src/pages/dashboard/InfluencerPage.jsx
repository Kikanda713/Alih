import { useState } from "react";
import {
  FaBullhorn,
  FaCertificate,
  FaCommentDots,
  FaCopy,
  FaHandshake,
  FaLink,
  FaMobileAlt,
  FaTag,
  FaWhatsapp,
} from "react-icons/fa";
import { useTindisaApi } from "../../api/client";
import { useLoad } from "../../api/useLoad";
import { promoShareLink } from "../../api/promo";
import { useToast } from "../../components/useToast";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  Spinner,
  Textarea,
} from "../../components/ui.jsx";
import { EarningsStats, EarningsTable } from "../../components/InfluencerParts.jsx";
import {
  METHODS,
  codesOf,
  copyText,
  methodLabel,
  statusOf,
  txt,
} from "../../components/influencerCommon";

/*
 * Programme influenceur côté commerçant (/dashboard/influenceur).
 *   GET  /v1/merchant/influencer          → { enrolled:false } | { enrolled:true, status, codes, stats, earnings, payoutMethod?, payoutPhoneMasked? }
 *   POST /v1/merchant/influencer/apply    { note? }
 *   PUT  /v1/merchant/influencer/payout   { method, phone }
 */

const ENDPOINT = "/v1/merchant/influencer";
const PAYOUT_METHODS = METHODS.filter((m) => m.value !== "other");

const shareText = (code) =>
  `Achetez et vendez en confiance sur Tindisa avec mon code ${code} : ` +
  `il vous donne une remise sur le certificat Tindisa. ${promoShareLink(code)}`;

function Explainer() {
  return (
    <ul className="procert-facts infl-facts">
      <li>
        <FaHandshake />{" "}
        <span>
          <b>50 % de la commission Tindisa</b> sur chaque vente conclue avec votre
          code, acquis dès que le vendeur a réglé sa commission.
        </span>
      </li>
      <li>
        <FaCertificate />{" "}
        <span>
          <b>30 % du montant des certificats</b> payés avec votre code.
        </span>
      </li>
      <li>
        <FaTag />{" "}
        <span>
          <b>Une remise pour vos clients</b> sur leur certificat quand ils
          utilisent votre code.
        </span>
      </li>
    </ul>
  );
}

function ApplyCard({ api, notify, onDone }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const apply = async () => {
    setBusy(true);
    try {
      await api.post(`${ENDPOINT}/apply`, note.trim() ? { note: note.trim() } : {});
      notify("Demande envoyée. L'équipe Tindisa vous répond rapidement.", "success");
      onDone();
    } catch (e) {
      notify(e?.message || "Envoi impossible pour le moment.", "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="infl-card">
      <h2 className="dash-h2">Gagnez de l'argent en recommandant Tindisa</h2>
      <p className="dash-sub">
        Partagez votre code promo autour de vous. Il est demandé à chaque vente
        conclue et à chaque paiement de certificat.
      </p>
      <Explainer />
      <Field label="Un mot pour l'équipe (facultatif)" hint="Votre audience, vos réseaux, votre activité…">
        <Textarea rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="procert-actions">
        <Button onClick={apply} disabled={busy}>
          <FaBullhorn /> {busy ? "Envoi…" : "Devenir influenceur"}
        </Button>
      </div>
    </Card>
  );
}

function PayoutCard({ data, api, notify, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [method, setMethod] = useState(txt(data.payoutMethod) || "mpesa");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const hasPayout = !!txt(data.payoutMethod);

  const save = async () => {
    if (!phone.trim()) return notify("Indiquez le numéro qui recevra vos gains.", "error");
    setBusy(true);
    try {
      await api.put(`${ENDPOINT}/payout`, { method, phone: phone.trim() });
      notify("Moyen de versement enregistré.", "success");
      setEditing(false);
      setPhone("");
      onSaved();
    } catch (e) {
      notify(e?.message || "Enregistrement impossible.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="infl-card">
      <h2 className="dash-h3">
        <FaMobileAlt /> Réception de vos gains
      </h2>
      {!editing ? (
        <>
          <p className="dash-sub">
            {hasPayout
              ? `Vos gains sont versés par ${methodLabel(data.payoutMethod)}${txt(data.payoutPhoneMasked) ? ` au ${txt(data.payoutPhoneMasked)}` : ""}.`
              : "Indiquez votre numéro Mobile Money pour recevoir vos gains."}
          </p>
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            {hasPayout ? "Modifier" : "Ajouter mon numéro"}
          </Button>
        </>
      ) : (
        <div className="infl-form">
          <Field label="Opérateur">
            <Select value={method} onChange={(e) => setMethod(e.target.value)} options={PAYOUT_METHODS} />
          </Field>
          <Field label="Numéro Mobile Money">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="2439XXXXXXXX" inputMode="tel" />
          </Field>
          <div className="procert-actions">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={busy}>
              Annuler
            </Button>
            <Button size="sm" onClick={save} disabled={busy}>
              {busy ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function InfluencerPage() {
  const api = useTindisaApi();
  const { notify } = useToast();
  const { data, loading, error, reload } = useLoad(() => api.get(ENDPOINT), []);

  const head = (
    <header className="dash-page-head">
      <h1 className="dash-h1">
        <FaBullhorn style={{ marginRight: 8 }} />
        Programme influenceur
      </h1>
      <p className="dash-sub">
        Recommandez Tindisa avec votre code promo et touchez une part sur les
        ventes et les certificats.
      </p>
    </header>
  );

  if (loading) {
    return (
      <div className="dash-page">
        {head}
        <Spinner label="Chargement…" />
      </div>
    );
  }
  if (error || !data || typeof data !== "object") {
    return (
      <div className="dash-page">
        {head}
        <EmptyState
          icon={<FaBullhorn />}
          title="Service indisponible"
          text="Le programme influenceur n'est pas accessible pour le moment. Réessayez plus tard."
        />
      </div>
    );
  }

  if (!data.enrolled) {
    return (
      <div className="dash-page">
        {head}
        <ApplyCard api={api} notify={notify} onDone={reload} />
      </div>
    );
  }

  const status = txt(data.status);
  if (status === "pending") {
    return (
      <div className="dash-page">
        {head}
        <Card className="infl-card">
          <div className="procert-status-head">
            <Badge tone="warn">Demande en cours</Badge>
          </div>
          <p className="dash-sub">
            Votre demande est bien reçue. L'équipe Tindisa l'examine et active
            votre code promo. Vous serez prévenu par message.
          </p>
          <Explainer />
        </Card>
      </div>
    );
  }

  const codes = codesOf(data.codes);
  const st = statusOf(status);
  const suspended = status === "suspended";

  return (
    <div className="dash-page">
      {head}

      {suspended && (
        <Card className="procert-notice">
          <div>
            <strong>Programme suspendu</strong>
            <p>
              Vos codes ne donnent plus droit à des gains pour le moment.
              Contactez Tindisa pour en savoir plus.
            </p>
          </div>
        </Card>
      )}

      <Card className="infl-card">
        <div className="infl-card-head">
          <h2 className="dash-h3">
            <FaTag /> Vos codes promo
          </h2>
          <Badge tone={st.tone}>{st.label}</Badge>
        </div>
        {codes.length === 0 ? (
          <p className="dash-sub">Aucun code actif pour l'instant.</p>
        ) : (
          <ul className="infl-codes">
            {codes.map((c) => (
              <li key={c.code} className={`infl-code${c.active ? "" : " is-off"}`}>
                <span className="infl-code-v">{c.code}</span>
                {!c.active && <Badge tone="neutral">Désactivé</Badge>}
                <div className="infl-code-actions">
                  <Button variant="ghost" size="sm" onClick={() => copyText(c.code, notify, "Code copié")}>
                    <FaCopy /> Code
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyText(promoShareLink(c.code), notify, "Lien copié")}
                  >
                    <FaLink /> Lien
                  </Button>
                  <Button
                    as="a"
                    variant="secondary"
                    size="sm"
                    href={`https://wa.me/?text=${encodeURIComponent(shareText(c.code))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FaWhatsapp /> Partager
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="infl-chat-tip">
          <FaCommentDots /> Suivez aussi vos gains et partagez votre code depuis
          WhatsApp ou Telegram : écrivez « mes gains » à l'assistant Tindisa.
        </p>
      </Card>

      <Card className="infl-card">
        <h2 className="dash-h3">Vos gains</h2>
        <EarningsStats stats={data.stats} />
      </Card>

      <PayoutCard
        key={`${txt(data.payoutMethod)}-${txt(data.payoutPhoneMasked)}`}
        data={data}
        api={api}
        notify={notify}
        onSaved={reload}
      />

      <Card className="infl-card">
        <h2 className="dash-h3">Détail des gains</h2>
        <EarningsTable earnings={data.earnings} />
      </Card>

      <Card className="infl-card">
        <h2 className="dash-h3">Comment ça marche</h2>
        <Explainer />
      </Card>
    </div>
  );
}
