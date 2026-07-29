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
import { resolvePayLink, executePayLink } from "../api/certificates";
import "../App.css";

const OPERATORS = [
  { code: "MP", name: "M-Pesa", logo: mpesa },
  { code: "AM", name: "Airtel Money", logo: airtel },
  { code: "OM", name: "Orange Money", logo: orange },
];

/**
 * Page de paiement AUTONOME servie par LIEN (l'agent l'envoie en messagerie, ou le
 * commerçant la copie depuis le dashboard). Le lien signé (?t=) porte l'actif à
 * certifier ; le paiement Mobile Money (Wanzo/SerdiPay) déclenche l'émission.
 */
export default function PayPage() {
  const [params] = useSearchParams();
  const token = params.get("t") || "";
  const [link, setLink] = useState(null); // { valid, productName, amountUsd, kind }
  const [loading, setLoading] = useState(true);
  const [telecom, setTelecom] = useState("MP");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState("form"); // form | pending | done | error
  const [msg, setMsg] = useState("");

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
    try {
      const r = await executePayLink(token, { phone: phone.trim(), telecom });
      if (r?.ok === false || r?.status === "failed") {
        setStep("error");
        setMsg(r?.reason || r?.message || "Le paiement n’a pas pu démarrer.");
        return;
      }
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
  const kindLabel =
    link?.kind === "update"
      ? "Mise à jour du certificat"
      : "Certification de l’actif";

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
            Réglez la certification de votre actif par Mobile Money. Une fois le
            paiement confirmé, le
            <strong> certificat de valeur Tindisa</strong> est émis et ancré sur
            la blockchain automatiquement.
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
          ) : step === "done" ? (
            <div className="pay-done">
              <FaCheckCircle className="pay-done-ic" />
              <strong>Paiement lancé</strong>
              <p>
                Validez la demande sur votre téléphone (code PIN Mobile Money).
                Dès confirmation, votre certificat sera émis. Vous pourrez le
                vérifier sur la page « Vérifier un certificat ».
              </p>
              <Link to="/verify" className="verify-again">
                Aller à la vérification
              </Link>
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
          <FaShieldAlt /> Paiement sécurisé Mobile Money. Tindisa n’émet le
          certificat qu’après confirmation du paiement.
        </p>
      </main>
    </div>
  );
}
