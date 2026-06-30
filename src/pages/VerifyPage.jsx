import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  FaShieldAlt, FaQrcode, FaFilePdf, FaHashtag, FaCheckCircle,
  FaTimesCircle, FaExclamationTriangle, FaExternalLinkAlt, FaArrowLeft, FaSpinner,
} from 'react-icons/fa'
import tindisaLogo from '../assets/tindisa-logo.png'
import { verifyCertificate, sha256File, decodeQrImage } from '../api/certificates'

const METHODS = [
  { id: 'hash', label: 'Code / Hash', icon: <FaHashtag /> },
  { id: 'pdf', label: 'Certificat PDF', icon: <FaFilePdf /> },
  { id: 'qr', label: 'QR code', icon: <FaQrcode /> },
]

function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('fr-FR', { dateStyle: 'long' }) } catch { return '—' }
}

export default function VerifyPage() {
  const [method, setMethod] = useState('hash')
  const [hash, setHash] = useState('')
  const [file, setFile] = useState(null)       // { name, fileHash } pour PDF
  const [qr, setQr] = useState('')             // contenu QR décodé (ou collé)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)   // { found, certificate } | { error }
  const pdfRef = useRef(null)
  const qrRef = useRef(null)

  const onPdf = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setBusy(true)
    try {
      const fileHash = await sha256File(f)
      setFile({ name: f.name, fileHash })
    } finally { setBusy(false) }
  }

  const onQr = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setBusy(true)
    try {
      const decoded = await decodeQrImage(f)
      if (decoded) setQr(decoded)
      else setResult({ error: 'QR non lisible sur cet appareil — collez le code du certificat ci-dessous.' })
    } finally { setBusy(false) }
  }

  const canVerify =
    (method === 'hash' && hash.trim()) ||
    (method === 'pdf' && file?.fileHash) ||
    (method === 'qr' && qr.trim())

  const verify = async () => {
    setBusy(true)
    setResult(null)
    try {
      const payload =
        method === 'hash' ? { hash: hash.trim() }
          : method === 'pdf' ? { fileHash: file.fileHash, fileName: file.name }
            : { qr: qr.trim() }
      const data = await verifyCertificate(payload)
      setResult(data)
    } catch (e) {
      setResult({ error: e?.message || 'Service de vérification indisponible. Réessayez plus tard.' })
    } finally { setBusy(false) }
  }

  const reset = () => { setResult(null); setHash(''); setFile(null); setQr('') }

  const cert = result?.found ? result.certificate : null
  const statusTone = { authentic: 'ok', revoked: 'bad', expired: 'warn' }[cert?.status] || 'ok'

  return (
    <div className="verify-page">
      <header className="verify-top">
        <Link to="/" className="verify-logo"><img src={tindisaLogo} alt="Tindisa" /></Link>
        <Link to="/" className="verify-back"><FaArrowLeft /> Accueil</Link>
      </header>

      <main className="verify-main">
        <div className="verify-hero">
          <div className="verify-badge"><FaShieldAlt /></div>
          <h1>Vérifier un certificat</h1>
          <p>
            Confirmez l'authenticité d'un produit certifié Tindisa. La vérification s'appuie sur un
            <strong> registre infalsifiable (blockchain)</strong> : importez le certificat PDF, scannez le
            QR code, ou saisissez le code.
          </p>
        </div>

        <div className="verify-card">
          <div className="verify-methods">
            {METHODS.map((m) => (
              <button
                key={m.id}
                className={`verify-method${method === m.id ? ' active' : ''}`}
                onClick={() => { setMethod(m.id); setResult(null) }}
              >
                {m.icon}<span>{m.label}</span>
              </button>
            ))}
          </div>

          <div className="verify-input">
            {method === 'hash' && (
              <input
                className="verify-field"
                placeholder="Collez le code / hash du certificat (ex. 0x…)"
                value={hash}
                onChange={(e) => setHash(e.target.value)}
              />
            )}

            {method === 'pdf' && (
              <button className="verify-drop" onClick={() => pdfRef.current?.click()}>
                <FaFilePdf />
                <span>{file ? file.name : 'Importer le certificat PDF'}</span>
                {file && <small>empreinte calculée ✓</small>}
                <input ref={pdfRef} type="file" accept="application/pdf" hidden onChange={onPdf} />
              </button>
            )}

            {method === 'qr' && (
              <>
                <button className="verify-drop" onClick={() => qrRef.current?.click()}>
                  <FaQrcode />
                  <span>{qr ? 'QR détecté ✓' : 'Importer une image du QR code'}</span>
                  <input ref={qrRef} type="file" accept="image/*" capture="environment" hidden onChange={onQr} />
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

          <button className="verify-submit" disabled={!canVerify || busy} onClick={verify}>
            {busy ? <><FaSpinner className="spin" /> Vérification…</> : <><FaShieldAlt /> Vérifier l'authenticité</>}
          </button>
        </div>

        {/* Résultat */}
        {result && !cert && (
          <div className={`verify-result ${result.error ? 'warn' : 'bad'}`}>
            {result.error
              ? <><FaExclamationTriangle /> <span>{result.error}</span></>
              : <><FaTimesCircle /> <span>Aucun certificat trouvé pour cet élément. Le produit n'est peut-être pas (encore) certifié.</span></>}
          </div>
        )}

        {cert && (
          <div className={`verify-cert tone-${statusTone}`}>
            <div className="verify-cert-head">
              {statusTone === 'ok' ? <FaCheckCircle /> : statusTone === 'bad' ? <FaTimesCircle /> : <FaExclamationTriangle />}
              <div>
                <strong>
                  {cert.status === 'authentic' ? 'Certificat authentique' : cert.status === 'revoked' ? 'Certificat révoqué' : 'Certificat expiré'}
                </strong>
                <span>Vérifié sur la blockchain {cert.chain ? `· ${cert.chain}` : ''}</span>
              </div>
            </div>
            <dl className="verify-cert-grid">
              <div><dt>Produit</dt><dd>{cert.productName || '—'}</dd></div>
              <div><dt>Vendeur</dt><dd>{cert.sellerName || '—'}</dd></div>
              {cert.category && <div><dt>Catégorie</dt><dd>{cert.category}</dd></div>}
              {cert.condition && <div><dt>État</dt><dd>{cert.condition}</dd></div>}
              <div><dt>Émis le</dt><dd>{fmtDate(cert.issuedAt)}</dd></div>
              {cert.issuer && <div><dt>Émetteur</dt><dd>{cert.issuer}</dd></div>}
              {cert.hash && <div className="wide"><dt>Empreinte</dt><dd className="mono">{cert.hash}</dd></div>}
            </dl>
            <div className="verify-cert-links">
              {cert.explorerUrl && (
                <a href={cert.explorerUrl} target="_blank" rel="noopener noreferrer">
                  <FaExternalLinkAlt /> Voir sur la blockchain
                </a>
              )}
              {cert.controlSheetUrl && (
                <a href={cert.controlSheetUrl} target="_blank" rel="noopener noreferrer">
                  <FaFilePdf /> Fiche de contrôle technique
                </a>
              )}
            </div>
            <button className="verify-again" onClick={reset}>Vérifier un autre certificat</button>
          </div>
        )}

        <p className="verify-foot">
          <FaShieldAlt /> Les certificats Tindisa sont ancrés dans un registre blockchain : leur authenticité
          est vérifiable publiquement et ne peut être falsifiée.
        </p>
      </main>
    </div>
  )
}
