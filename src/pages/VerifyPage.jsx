import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FaShieldAlt,
  FaQrcode,
  FaFilePdf,
  FaHashtag,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaExternalLinkAlt,
  FaArrowLeft,
  FaSpinner,
  FaDownload,
  FaCube,
  FaCertificate,
  FaTools,
  FaUserCheck,
  FaStore,
} from "react-icons/fa";
import tindisaLogo from "../assets/tindisa-logo.png";
import {
  verifyCertificate,
  sha256File,
  decodeQrImage,
  certAssetUrl,
  getDemoCertificate,
} from "../api/certificates";
import { apiBaseUrl } from "../auth/config";
import "../App.css";

const METHODS = [
  { id: "hash", label: "Code / série", icon: <FaHashtag /> },
  { id: "pdf", label: "Certificat PDF", icon: <FaFilePdf /> },
  { id: "qr", label: "QR code", icon: <FaQrcode /> },
];

function fmtDate(d) {
  if (!d) return "·";
  try {
    return new Date(d).toLocaleDateString("fr-FR", { dateStyle: "long" });
  } catch {
    return "·";
  }
}

function fmtValue(v) {
  if (!v || v.amount == null) return null;
  const n = new Intl.NumberFormat("fr-FR").format(Number(v.amount));
  const cur = (v.currency || "CDF").toUpperCase();
  return cur === "USD" ? `${n} $` : `${n} ${cur}`;
}

// Vérifie un payload (hash / serial / qr / fileHash). Ne rejette jamais :
// renvoie le résultat ou { error }.
function verifyOutcome(payload) {
  return verifyCertificate(payload).catch((e) => ({
    error:
      e?.message ||
      "Service de vérification indisponible. Réessayez plus tard.",
  }));
}

// Spécimen gratuit : 'asset' (certificat de valeur), 'pro' (aptitude
// professionnelle) ou 'shop' (établissement vérifié).
async function fetchDemo(kind) {
  if (kind !== "pro" && kind !== "shop") return getDemoCertificate();
  const res = await fetch(`${apiBaseUrl}/v1/certificates/demo?kind=${kind}`, {
    method: "POST",
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.message || `Démo indisponible (${res.status})`);
  }
  return data;
}

// Libellé lisible d'un métier ({ id, label } ou chaîne).
const tradeName = (t) => (typeof t === "string" ? t : t?.label || t?.id || "");
// Libellé d'un point vérifié (chaîne ou { label }) ; texte affichable sûr.
const checkName = (c) => (typeof c === "string" ? c : c?.label || c?.key || "");
const asText = (v) => (typeof v === "string" || typeof v === "number" ? String(v) : "");

const PRO_STATE = {
  valid: { tone: "ok", label: "Valide", title: "Certificat valide" },
  expired: { tone: "warn", label: "Expiré", title: "Certificat expiré" },
  revoked: { tone: "bad", label: "Révoqué", title: "Certificat révoqué" },
};

const STATUS_LABEL = {
  authentic: "Certificat authentique",
  revoked: "Certificat révoqué",
  expired: "Certificat expiré",
  unknown: "Authenticité non confirmée",
};

export default function VerifyPage() {
  const [params, setParams] = useSearchParams();
  const [method, setMethod] = useState("hash");
  // Scan d'un QR → ouvre /verify?c=SERIAL : champ pré-rempli et vérification
  // lancée dès l'arrivée (état initial dérivé de l'URL, cf. effet plus bas).
  const [hash, setHash] = useState(() => params.get("c") || "");
  const [file, setFile] = useState(null); // { name, fileHash } pour PDF
  const [qr, setQr] = useState("");
  const [busy, setBusy] = useState(() => !!params.get("c"));
  const [result, setResult] = useState(null);
  const pdfRef = useRef(null);
  const qrRef = useRef(null);

  // Vérifie un payload donné (hash / serial / qr / fileHash).
  const runVerify = useCallback(async (payload) => {
    setBusy(true);
    setResult(null);
    setResult(await verifyOutcome(payload));
    setBusy(false);
  }, []);

  // Scan d'un QR → ouvre /verify?c=SERIAL : auto-vérification à l'arrivée.
  useEffect(() => {
    const c = params.get("c");
    if (!c) return;
    verifyOutcome({ serial: c }).then((data) => {
      setResult(data);
      setBusy(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Démo gratuite : génère/obtient un certificat SPÉCIMEN et le vérifie (test complet).
  const viewExample = async (kind = "asset") => {
    setBusy(true);
    setResult(null);
    try {
      const d = await fetchDemo(kind);
      if (d?.serial) {
        setMethod("hash");
        setHash(d.serial);
        await runVerify({ serial: d.serial });
      } else {
        setResult({ error: "Exemple indisponible pour le moment." });
        setBusy(false);
      }
    } catch (e) {
      setResult({
        error: e?.message || "Exemple indisponible pour le moment.",
      });
      setBusy(false);
    }
  };

  const onPdf = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const fileHash = await sha256File(f);
      setFile({ name: f.name, fileHash });
    } finally {
      setBusy(false);
    }
  };

  const onQr = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const decoded = await decodeQrImage(f);
      if (decoded) setQr(decoded);
      else
        setResult({
          error:
            "QR non lisible sur cet appareil : collez le code du certificat ci-dessous.",
        });
    } finally {
      setBusy(false);
    }
  };

  const canVerify =
    (method === "hash" && hash.trim()) ||
    (method === "pdf" && file?.fileHash) ||
    (method === "qr" && qr.trim());

  const verify = () => {
    if (method === "hash") {
      const v = hash.trim();
      runVerify(/^tindisa-/i.test(v) ? { serial: v } : { hash: v });
    } else if (method === "pdf") {
      runVerify({ fileHash: file.fileHash, fileName: file.name });
    } else {
      runVerify({ qr: qr.trim() });
    }
  };

  const reset = () => {
    setResult(null);
    setHash("");
    setFile(null);
    setQr("");
    if (params.get("c")) setParams({}, { replace: true });
  };

  const cert = result?.found ? result.certificate : null;
  const statusTone =
    { authentic: "ok", revoked: "bad", expired: "warn", unknown: "warn" }[
      cert?.status
    ] || "warn";
  const value = fmtValue(cert?.value);
  const pdfSrc = cert?.pdfUrl ? certAssetUrl(cert.pdfUrl) : null;
  // Alerte si un PDF importé ne correspond PAS à l'empreinte ancrée (document altéré).
  const tampered = cert && cert.hashMatch === false;
  // Certificat d'aptitude professionnelle (technicien / artisan).
  const certKind = cert?.kind || result?.kind;
  const isPro = certKind === "pro";
  // Certificat d'établissement vérifié (visite de l'équipe Tindisa).
  const isShop = certKind === "shop";
  const shopChecks = (Array.isArray(cert?.checks) ? cert.checks : [])
    .map(checkName)
    .filter((c) => typeof c === "string" && c);
  const shopPlace = [asText(cert?.commune), asText(cert?.city)].filter(Boolean).join(", ");
  const proState =
    cert?.status === "revoked"
      ? PRO_STATE.revoked
      : cert?.expired || cert?.status === "expired"
        ? PRO_STATE.expired
        : PRO_STATE.valid;
  const proTrades = (cert?.trades || []).map(tradeName).filter(Boolean);
  const proZones = (Array.isArray(cert?.zones) ? cert.zones : [])
    .map((z) => (typeof z === "string" ? z : z?.label || z?.name || ""))
    .filter(Boolean);

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
            <FaShieldAlt />
          </div>
          <h1>Vérifier un certificat</h1>
          <p>
            Confirmez l'authenticité d'un certificat Tindisa : actif de valeur,
            aptitude professionnelle d'un technicien ou établissement vérifié. La vérification
            s'appuie sur un
            <strong> registre infalsifiable (blockchain)</strong> : importez le
            certificat PDF, scannez le QR code, ou saisissez son numéro de
            série.
          </p>
          <div className="verify-examples">
            <span>Voir un exemple :</span>
            <button
              className="verify-example"
              onClick={() => viewExample("asset")}
              disabled={busy}
            >
              {busy ? <FaSpinner className="spin" /> : <FaCertificate />}{" "}
              Certificat de valeur
            </button>
            <button
              className="verify-example"
              onClick={() => viewExample("pro")}
              disabled={busy}
            >
              {busy ? <FaSpinner className="spin" /> : <FaTools />} Certificat
              d'aptitude professionnelle
            </button>
            <button
              className="verify-example"
              onClick={() => viewExample("shop")}
              disabled={busy}
            >
              {busy ? <FaSpinner className="spin" /> : <FaStore />} Établissement
              vérifié
            </button>
          </div>
        </div>

        <div className="verify-card">
          <div className="verify-methods">
            {METHODS.map((m) => (
              <button
                key={m.id}
                className={`verify-method${method === m.id ? " active" : ""}`}
                onClick={() => {
                  setMethod(m.id);
                  setResult(null);
                }}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          <div className="verify-input">
            {method === "hash" && (
              <input
                className="verify-field"
                placeholder="N° de série (TINDISA-CERT-…, TINDISA-CAP-…, TINDISA-ETS-…) ou empreinte (0x…)"
                value={hash}
                onChange={(e) => setHash(e.target.value)}
              />
            )}

            {method === "pdf" && (
              <button
                className="verify-drop"
                onClick={() => pdfRef.current?.click()}
              >
                <FaFilePdf />
                <span>{file ? file.name : "Importer le certificat PDF"}</span>
                {file && <small>empreinte calculée ✓</small>}
                <input
                  ref={pdfRef}
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={onPdf}
                />
              </button>
            )}

            {method === "qr" && (
              <>
                <button
                  className="verify-drop"
                  onClick={() => qrRef.current?.click()}
                >
                  <FaQrcode />
                  <span>
                    {qr ? "QR détecté ✓" : "Importer une image du QR code"}
                  </span>
                  <input
                    ref={qrRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    hidden
                    onChange={onQr}
                  />
                </button>
                <input
                  className="verify-field"
                  placeholder="…ou collez le contenu du QR"
                  value={qr}
                  onChange={(e) => setQr(e.target.value)}
                />
              </>
            )}
          </div>

          <button
            className="verify-submit"
            disabled={!canVerify || busy}
            onClick={verify}
          >
            {busy ? (
              <>
                <FaSpinner className="spin" /> Vérification…
              </>
            ) : (
              <>
                <FaShieldAlt /> Vérifier l'authenticité
              </>
            )}
          </button>
        </div>

        {/* Résultat introuvable / erreur */}
        {result && !cert && (
          <div className={`verify-result ${result.error ? "warn" : "bad"}`}>
            {result.error ? (
              <>
                <FaExclamationTriangle /> <span>{result.error}</span>
              </>
            ) : (
              <>
                <FaTimesCircle />{" "}
                <span>
                  Aucun certificat trouvé. Ce code ne correspond à aucun
                  certificat délivré par Tindisa.
                </span>
              </>
            )}
          </div>
        )}

        {cert && isPro && (
          <div className={`verify-cert tone-${proState.tone}`}>
            <div className="verify-cert-head">
              {proState.tone === "ok" ? (
                <FaUserCheck />
              ) : proState.tone === "bad" ? (
                <FaTimesCircle />
              ) : (
                <FaExclamationTriangle />
              )}
              <div>
                <strong>Certificat d'aptitude professionnelle</strong>
                <span>
                  <em className={`verify-pill tone-${proState.tone}`}>
                    {proState.label}
                  </em>
                  {cert.serial ? ` ${cert.serial}` : ""}
                </span>
              </div>
            </div>

            {tampered && (
              <div className="verify-tamper">
                <FaExclamationTriangle /> Le document importé ne correspond pas
                à l'empreinte enregistrée : il a pu être modifié.
              </div>
            )}

            <dl className="verify-cert-grid">
              <div className="wide">
                <dt>Titulaire</dt>
                <dd>{cert.holderName || "Non précisé"}</dd>
              </div>
              {proTrades.length > 0 && (
                <div className="wide">
                  <dt>Métiers</dt>
                  <dd>{proTrades.join(", ")}</dd>
                </div>
              )}
              {proZones.length > 0 && (
                <div className="wide">
                  <dt>Zones d'intervention</dt>
                  <dd>{proZones.join(", ")}</dd>
                </div>
              )}
              {cert.experienceYears != null && (
                <div>
                  <dt>Expérience</dt>
                  <dd>
                    {cert.experienceYears} an
                    {Number(cert.experienceYears) > 1 ? "s" : ""}
                  </dd>
                </div>
              )}
              <div>
                <dt>Délivré le</dt>
                <dd>{fmtDate(cert.issuedAt)}</dd>
              </div>
              <div>
                <dt>{proState === PRO_STATE.expired ? "A expiré le" : "Valable jusqu'au"}</dt>
                <dd>{fmtDate(cert.validUntil)}</dd>
              </div>
              <div>
                <dt>Émetteur</dt>
                <dd>{cert.issuer || "Tindisa"}</dd>
              </div>
              {cert.hash && (
                <div className="wide">
                  <dt>Empreinte (SHA-256)</dt>
                  <dd className="mono">{cert.hash}</dd>
                </div>
              )}
            </dl>

            {pdfSrc && (
              <div className="verify-pdf-wrap">
                <div className="verify-pdf-bar">
                  <span>
                    <FaFilePdf /> Certificat officiel
                  </span>
                  <a
                    href={pdfSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                  >
                    <FaDownload /> Télécharger
                  </a>
                </div>
                <iframe
                  className="verify-pdf"
                  src={pdfSrc}
                  title="Certificat d'aptitude professionnelle Tindisa"
                />
              </div>
            )}

            <div className="verify-cert-links">
              {cert.shop?.id && (
                <Link to={`/boutique/${encodeURIComponent(cert.shop.id)}`}>
                  <FaExternalLinkAlt /> Voir le profil
                  {cert.shop.name ? ` de ${cert.shop.name}` : ""}
                  {cert.shop.city ? ` (${cert.shop.city})` : ""}
                </Link>
              )}
              {cert.explorerUrl && (
                <a
                  href={cert.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaExternalLinkAlt /> Voir la transaction blockchain
                </a>
              )}
            </div>
            <button className="verify-again" onClick={reset}>
              Vérifier un autre certificat
            </button>
          </div>
        )}

        {cert && isShop && (
          <div className={`verify-cert tone-${proState.tone}`}>
            <div className="verify-cert-head">
              {proState.tone === "ok" ? (
                <FaStore />
              ) : proState.tone === "bad" ? (
                <FaTimesCircle />
              ) : (
                <FaExclamationTriangle />
              )}
              <div>
                <strong>Établissement vérifié par Tindisa</strong>
                <span>
                  <em className={`verify-pill tone-${proState.tone}`}>
                    {proState.label}
                  </em>
                  {asText(cert.serial) ? ` ${asText(cert.serial)}` : ""}
                </span>
              </div>
            </div>

            {tampered && (
              <div className="verify-tamper">
                <FaExclamationTriangle /> Le document importé ne correspond pas
                à l'empreinte enregistrée : il a pu être modifié.
              </div>
            )}

            <dl className="verify-cert-grid">
              <div className="wide">
                <dt>Établissement</dt>
                <dd>{asText(cert.shopName) || asText(cert.shop?.name) || "Non précisé"}</dd>
              </div>
              {asText(cert.typeLabel) && (
                <div>
                  <dt>Activité</dt>
                  <dd>{asText(cert.typeLabel)}</dd>
                </div>
              )}
              {shopPlace && (
                <div>
                  <dt>Localisation</dt>
                  <dd>{shopPlace}</dd>
                </div>
              )}
              {cert.visitedAt && (
                <div>
                  <dt>Visité le</dt>
                  <dd>{fmtDate(cert.visitedAt)}</dd>
                </div>
              )}
              {(cert.verifiedAt || cert.issuedAt) && (
                <div>
                  <dt>Certifié le</dt>
                  <dd>{fmtDate(cert.verifiedAt || cert.issuedAt)}</dd>
                </div>
              )}
              <div>
                <dt>{proState === PRO_STATE.expired ? "A expiré le" : "Valable jusqu'au"}</dt>
                <dd>{fmtDate(cert.validUntil)}</dd>
              </div>
              <div>
                <dt>Émetteur</dt>
                <dd>{asText(cert.issuer) || "Tindisa"}</dd>
              </div>
              {shopChecks.length > 0 && (
                <div className="wide">
                  <dt>Points vérifiés lors de la visite</dt>
                  <dd>
                    <ul className="verify-checks">
                      {shopChecks.map((c, i) => (
                        <li key={i}>
                          <FaCheckCircle /> {c}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
              {asText(cert.hash) && (
                <div className="wide">
                  <dt>Empreinte (SHA-256)</dt>
                  <dd className="mono">{asText(cert.hash)}</dd>
                </div>
              )}
            </dl>

            {pdfSrc && (
              <div className="verify-pdf-wrap">
                <div className="verify-pdf-bar">
                  <span>
                    <FaFilePdf /> Certificat officiel
                  </span>
                  <a href={pdfSrc} target="_blank" rel="noopener noreferrer" download>
                    <FaDownload /> Télécharger
                  </a>
                </div>
                <iframe
                  className="verify-pdf"
                  src={pdfSrc}
                  title="Certificat d'établissement vérifié Tindisa"
                />
              </div>
            )}

            <div className="verify-cert-links">
              {cert.shop?.id && (
                <Link to={`/boutique/${encodeURIComponent(cert.shop.id)}`}>
                  <FaExternalLinkAlt /> Voir la page
                  {asText(cert.shop.name) ? ` de ${asText(cert.shop.name)}` : " de l'établissement"}
                </Link>
              )}
              {cert.explorerUrl && (
                <a href={cert.explorerUrl} target="_blank" rel="noopener noreferrer">
                  <FaExternalLinkAlt /> Voir la transaction blockchain
                </a>
              )}
            </div>
            <button className="verify-again" onClick={reset}>
              Vérifier un autre certificat
            </button>
          </div>
        )}

        {cert && !isPro && !isShop && (
          <div className={`verify-cert tone-${statusTone}`}>
            <div className="verify-cert-head">
              {statusTone === "ok" ? (
                <FaCheckCircle />
              ) : statusTone === "bad" ? (
                <FaTimesCircle />
              ) : (
                <FaExclamationTriangle />
              )}
              <div>
                <strong>
                  {STATUS_LABEL[cert.status] || STATUS_LABEL.unknown}
                </strong>
                <span>
                  {cert.serial ? `${cert.serial} · ` : ""}Vérifié sur la
                  blockchain{cert.chain ? ` · ${cert.chain}` : ""}
                </span>
              </div>
            </div>

            {tampered && (
              <div className="verify-tamper">
                <FaExclamationTriangle /> Le document importé ne correspond pas
                à l'empreinte enregistrée : il a pu être modifié. Comparez avec
                le PDF officiel ci-dessous.
              </div>
            )}

            <dl className="verify-cert-grid">
              <div>
                <dt>Actif</dt>
                <dd>{cert.productName || "·"}</dd>
              </div>
              <div>
                <dt>Propriétaire</dt>
                <dd>{cert.ownerName || "·"}</dd>
              </div>
              {cert.sellerName && (
                <div>
                  <dt>Vendeur</dt>
                  <dd>{cert.sellerName}</dd>
                </div>
              )}
              {cert.category && (
                <div>
                  <dt>Catégorie</dt>
                  <dd>{cert.category}</dd>
                </div>
              )}
              {value && (
                <div>
                  <dt>Valeur estimée</dt>
                  <dd>{value}</dd>
                </div>
              )}
              <div>
                <dt>Émis le</dt>
                <dd>{fmtDate(cert.issuedAt)}</dd>
              </div>
              {cert.version && (
                <div>
                  <dt>Version</dt>
                  <dd>v{cert.version}</dd>
                </div>
              )}
              <div>
                <dt>Émetteur</dt>
                <dd>{cert.issuer || "Tindisa"}</dd>
              </div>
              {cert.hash && (
                <div className="wide">
                  <dt>Empreinte (SHA-256)</dt>
                  <dd className="mono">{cert.hash}</dd>
                </div>
              )}
            </dl>

            {/* Historique du cycle de vie de l'actif (métadonnées publiques) */}
            {cert.history?.length > 0 && (
              <div className="verify-history">
                <h3>Historique de l'actif</h3>
                <div className="verify-history-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Élément</th>
                        <th>Valeur</th>
                        <th>Catégorie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cert.history.map((h, i) => (
                        <tr key={i}>
                          <td className="mono">{h.date || "·"}</td>
                          <td>{h.label}</td>
                          <td>{h.value}</td>
                          <td>{h.category || "·"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Aperçu du certificat PDF directement dans l'app */}
            {pdfSrc && (
              <div className="verify-pdf-wrap">
                <div className="verify-pdf-bar">
                  <span>
                    <FaFilePdf /> Certificat officiel
                  </span>
                  <a
                    href={pdfSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                  >
                    <FaDownload /> Télécharger
                  </a>
                </div>
                <iframe
                  className="verify-pdf"
                  src={pdfSrc}
                  title="Certificat de valeur Tindisa"
                />
              </div>
            )}

            <div className="verify-cert-links">
              {cert.explorerUrl && (
                <a
                  href={cert.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaExternalLinkAlt /> Voir la transaction blockchain
                </a>
              )}
              {cert.ipfsUrl && (
                <a
                  href={cert.ipfsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaCube /> Document sur IPFS
                </a>
              )}
            </div>
            <button className="verify-again" onClick={reset}>
              Vérifier un autre certificat
            </button>
          </div>
        )}

        <p className="verify-foot">
          <FaShieldAlt /> Les certificats Tindisa sont ancrés dans un registre
          blockchain : leur authenticité est vérifiable publiquement et ne peut
          être falsifiée.
        </p>
      </main>
    </div>
  );
}
