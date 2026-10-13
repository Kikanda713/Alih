import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FaShieldAlt,
  FaArrowLeft,
  FaSpinner,
  FaCertificate,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import tindisaLogo from "../assets/tindisa-logo.png";
import mpesa from "../assets/MPESA.png";
import airtel from "../assets/AIRTEL.png";
import orange from "../assets/ORANGE.png";
import { resolvePayLink, executePayLink, getPayStatus } from "../api/certificates";
import "../App.css";

const OPERATORS = [
  { code: "MP", name: "M-Pesa", logo: mpesa },
  { code: "AM", name: "Airtel Money", logo: airtel },
  { code: "OM", name: "Orange Money", logo: orange },
];

/**
 * Page de paiement AUTONOME servie par LIEN (l'agent l'envoie en messagerie, ou le
 * commerçant la copie depuis le dashboard). Le lien signé (?t=) porte l'actif à
 * certifier. Le paiement Mobile Money (Wanzo/SerdiPay) NE délivre PAS le
 * certificat : l'équipe Tindisa vérifie puis délivre. Après lancement, la page
 * sonde /v1/certificates/pay-status toutes les 4 s (2 min au plus).
 */
const POLL_MS = 4000;
const POLL_MAX = 30;
const txt = (v) => (typeof v === "string" || typeof v === "number" ? String(v) : "");

export default function PayPage() {
  const [params] = useSearchParams();
  const token = params.get("t") || "";
  const [link, setLink] = useState(null); // { valid, productName, amountUsd, kind }
  const [loading, setLoading] = useState(true);
  const [telecom, setTelecom] = useState("MP");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState("form"); // form | pending | done | error
  const [msg, setMsg] = useState("");
  const [paymentId, setPaymentId] = useState("");
  // Résultat du suivi : null (en cours) | { status:'paid'|'failed'|'timeout', … }
  const [outcome, setOutcome] = useState(null);

  // Suivi du paiement une fois lancé : arrêt sur payé / échoué ou après ~2 min.
  useEffect(() => {
    if (step !== "done" || !token) return;
    let alive = true;
    let n = 0;
    const id = setInterval(async () => {
      n += 1;
      let r = null;
      try {
        r = await getPayStatus(token, paymentId);
      } catch {
        /* réseau : on réessaie au tour suivant */
      }
      if (!alive) return;
      const st = r && typeof r === "object" ? r.status : null;
      if (st === "paid" || st === "failed") {
        clearInterval(id);
        setOutcome(r);
      } else if (n >= POLL_MAX) {
        clearInterval(id);
        setOutcome({ status: "timeout" });
      }
    }, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [step, token, paymentId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const d = await resolvePayLink(token);
        if (alive) setLink(d);
      } catch {
        if (alive) setLink({ valid: false });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const pay = async () => {
    if (!phone.trim()) {
      setMsg("Entrez votre numéro de téléphone.");
      return;
    }
    setStep("pending");
    setMsg("");
    setOutcome(null);
    try {
      const r = await executePayLink(token, { phone: phone.trim(), telecom });
      if (r?.ok === false || r?.status === "failed") {
        setStep("error");
        setMsg(txt(r?.reason) || txt(r?.message) || "Le paiement n’a pas pu démarrer.");
        return;
      }
      setPaymentId(txt(r?.paymentId));
      setStep("done");
    } catch (e) {
      setStep("error");
      setMsg(e?.message || "Service de paiement indisponible.");
    }
  };

  const amount =
    link?.amountUsd != null
      ? `${Number(link.amountUsd).toLocaleString("fr-FR")} $`
      : "";
  const certKind = link?.certKind;
  const kindLabel =
    link?.kind === "update"
      ? certKind === "pro" || certKind === "shop"
        ? "Renouvellement du certificat"
        : "Mise à jour du certificat"
      : certKind === "pro"
        ? "Certificat d’aptitude professionnelle"
        : certKind === "shop"
          ? "Certificat d’établissement vérifié"
          : "Certification de l’actif";
  const retry = () => {
    setOutcome(null);
    setMsg("");
    setStep("form");
  };
  const serial = txt(outcome?.serial);
  const verifyHref =
    txt(outcome?.verifyUrl) ||
    (serial ? `/verify?c=${encodeURIComponent(serial)}` : "");

  return (
    <div className="verify-page">
      <header className="verify-top">
        <Link to="/" className="verify-logo">
          <img src={tindisaLogo} alt="Tindisa" />
        </Link>
        <Link to="/" className="verify-back">
          <FaArrowLeft /> Accueil
        </Link>
      </header>

      <main className="verify-main">
        <div className="verify-hero">
          <div className="verify-badge">
            <FaCertificate />
          </div>
          <h1>Paiement du certificat</h1>
          <p>
            Réglez votre certificat Tindisa par Mobile Money. Une fois le
            paiement reçu, l’équipe Tindisa vérifie votre demande puis délivre
            le certificat, sécurisé et vérifiable en ligne. Vous serez prévenu
            par message.
          </p>
        </div>

        <div className="verify-card">
          {loading ? (
            <div className="pay-pending">
              <FaSpinner className="spin" /> <span>Chargement…</span>
            </div>
          ) : !token || !link?.valid ? (
            <div className="verify-result warn">
              <FaExclamationTriangle />
              <span>
                Ce lien de paiement est invalide ou expiré. Demandez-en un
                nouveau à Tindisa.
              </span>
            </div>
          ) : step === "done" && outcome?.status === "paid" ? (
            <div className="pay-done">
              <FaCheckCircle className="pay-done-ic" />
              <strong>Paiement reçu</strong>
              {outcome.certStatus === "issued" && serial ? (
                <>
                  <p>
                    Votre certificat <strong>{serial}</strong> est délivré. Vous
                    pouvez le vérifier en ligne à tout moment.
                  </p>
                  {/^https?:\/\//i.test(verifyHref) ? (
                    <a href={verifyHref} className="verify-again">
                      Vérifier le certificat
                    </a>
                  ) : (
                    <Link to={verifyHref} className="verify-again">
                      Vérifier le certificat
                    </Link>
                  )}
                </>
              ) : (
                <p>
                  L’équipe Tindisa vérifie puis délivre le certificat ; vous
                  serez prévenu par message.
                </p>
              )}
            </div>
          ) : step === "done" && outcome?.status === "failed" ? (
            <div className="pay-done">
              <FaExclamationTriangle className="pay-done-ic pay-fail-ic" />
              <strong>Paiement non abouti</strong>
              <p>
                Le paiement a été refusé ou annulé. Aucun montant n’a été
                prélevé. Vous pouvez réessayer.
              </p>
              <button className="verify-submit" onClick={retry}>
                Réessayer
              </button>
            </div>
          ) : step === "done" && outcome?.status === "timeout" ? (
            <div className="pay-done">
              <FaSpinner className="pay-done-ic pay-wait-ic" />
              <strong>Confirmation en attente</strong>
              <p>
                Nous n’avons pas encore reçu la confirmation de l’opérateur. Si
                vous avez validé le paiement, l’équipe Tindisa traitera votre
                demande et vous serez prévenu par message.
              </p>
              <button className="verify-again" onClick={retry}>
                Payer de nouveau
              </button>
            </div>
          ) : step === "done" ? (
            <div className="pay-pending">
              <FaSpinner className="spin" />
              <p>
                Validez la demande sur votre téléphone (code PIN Mobile Money).
                En attente de la confirmation du paiement…
              </p>
            </div>
          ) : step === "pending" ? (
            <div className="pay-pending">
              <FaSpinner className="spin" />
              <p>Initialisation du paiement… confirmez sur votre téléphone.</p>
            </div>
          ) : (
            <>
              <div className="pay-summary">
                <div>
                  <span className="pay-summary-label">{kindLabel}</span>
                  <strong>{link.productName}</strong>
                </div>
                <div className="pay-summary-amount">{amount}</div>
              </div>

              <span className="ui-field-label">Opérateur Mobile Money</span>
              <div className="pay-operators">
                {OPERATORS.map((o) => (
                  <button
                    key={o.code}
                    type="button"
                    className={`pay-op${telecom === o.code ? " active" : ""}`}
                    onClick={() => setTelecom(o.code)}
                  >
                    <img src={o.logo} alt={o.name} />
                    <span>{o.name}</span>
                  </button>
                ))}
              </div>
              <label className="ui-field-label" htmlFor="pay-phone">
                Numéro de téléphone
              </label>
              <input
                id="pay-phone"
                className="verify-field"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="2439XXXXXXXX"
                inputMode="tel"
              />
              {msg && <p className="form-error">{msg}</p>}
              <button className="verify-submit" onClick={pay}>
                <FaShieldAlt /> Payer {amount}
              </button>
            </>
          )}

          {step === "error" && (
            <div className="verify-result warn" style={{ marginTop: 12 }}>
              <FaExclamationTriangle /> <span>{msg}</span>
            </div>
          )}
        </div>

        <p className="verify-foot">
          <FaShieldAlt /> Paiement sécurisé Mobile Money. Tindisa délivre le
          certificat après réception du paiement et vérification par son équipe.
        </p>
      </main>
    </div>
  );
}
