import { useState } from "react";
import { Modal, Button, Field, Input, Spinner } from "./ui.jsx";
import PromoCodeField from "./PromoCodeField.jsx";
import { amountOf, promoTotal, isInvalidPromoError, promoReasonLabel } from "../api/promo";
import { useTindisaApi } from "../api/client";
import { useToast } from "./useToast";
import { useT } from "../i18n";
import mpesa from "../assets/MPESA.png";
import airtel from "../assets/AIRTEL.png";
import orange from "../assets/ORANGE.png";

// Opérateurs -> codes telecom SerdiPay
const OPERATORS = [
  { code: "MP", name: "M-Pesa", logo: mpesa },
  { code: "AM", name: "Airtel Money", logo: airtel },
  { code: "OM", name: "Orange Money", logo: orange },
];

/**
 * Paiement Mobile Money d'un abonnement. Choix opérateur + téléphone -> /pay.
 * Le paiement réel est encaissé par Wanzo (SerdiPay) ; on attend la confirmation
 * (PIN) puis le callback relayé qui active l'abonnement -> on sonde le statut.
 */
export default function PaymentModal({
  open,
  plan,
  amount,
  onClose,
  onDone,
  variant = "subscription",
  productId,
  onCopyLink,
  certKind = "issue",
}) {
  const api = useTindisaApi();
  const { notify } = useToast();
  const { t } = useT();
  const [telecom, setTelecom] = useState("MP");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState("form");
  const [busy, setBusy] = useState(false);
  const [charged, setCharged] = useState(null);
  // Code promo d'influenceur (certificats) : remise appliquée au montant.
  const [promo, setPromo] = useState(null);
  const close = () => {
    setPromo(null);
    onClose?.();
  };
  const isFees = variant === "fees";
  const isCert = variant === "certificate";

  const poll = async () => {
    for (let i = 0; i < 16; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      try {
        if (isCert) {
          const list = await api.get("/v1/merchant/certificates");
          const c = (Array.isArray(list) ? list : []).find(
            (x) => x.productId === productId,
          );
          // Le paiement ne délivre plus le certificat : l'équipe Tindisa
          // inspecte puis délivre. On s'arrête dès que le paiement est reçu.
          const received =
            certKind === "update"
              ? c?.updatePaid === true || c?.updateRequested === false
              : c?.paid === true ||
                c?.status === "paid" ||
                c?.status === "issued";
          if (received) {
            notify(
              "Paiement reçu : l'équipe Tindisa vérifie puis délivre le certificat. Vous serez prévenu par message.",
              "success",
            );
            onDone?.();
            setStep("form");
            setBusy(false);
            close();
            return;
          }
        } else if (isFees) {
          const c = await api.get("/v1/merchant/commissions");
          if (Number(c?.owedUsd || 0) === 0) {
            notify(t("pay.success"), "success");
            onDone?.();
            setStep("form");
            setBusy(false);
            close();
            return;
          }
        } else {
          const s = await api.get("/v1/merchant/subscription");
          const st = s?.subscription?.status;
          if (st === "active" || st === "trialing") {
            notify(t("pay.success"), "success");
            onDone?.();
            setStep("form");
            setBusy(false);
            close();
            return;
          }
          if (st === "payment_failed") {
            notify(t("pay.failed"), "error");
            setStep("form");
            setBusy(false);
            return;
          }
        }
      } catch {
        /* continue polling */
      }
    }
    notify(t("pay.timeout"), "info");
    onDone?.();
    setStep("form");
    setBusy(false);
    close();
  };

  const pay = async () => {
    if (!phone.trim()) return notify(t("pay.phoneRequired"), "error");
    setBusy(true);
    try {
      const r = isCert
        ? await api.post("/v1/merchant/certificates/pay", {
            productId,
            ...(certKind === "update" ? { kind: "update" } : {}),
            ...(promo?.code ? { promoCode: promo.code } : {}),
            phone: phone.trim(),
            telecom,
          })
        : isFees
          ? await api.post("/v1/merchant/commissions/pay", {
              phone: phone.trim(),
              telecom,
            })
          : await api.post("/v1/merchant/subscription/pay", {
              plan,
              phone: phone.trim(),
              telecom,
            });
      if (r?.status === "failed") {
        notify(r?.message || t("pay.failed"), "error");
        setBusy(false);
        return;
      }
      // Montant réellement demandé par le backend (tarif de la ville, figé au lancement).
      const disc = Number(r?.discountUsd);
      setCharged(
        r?.amountUsd != null
          ? `${Number(r.amountUsd).toLocaleString("fr-FR")} $${disc > 0 ? ` (remise de ${disc.toLocaleString("fr-FR")} $)` : ""}`
          : null,
      );
      setStep("pending");
      poll();
    } catch (e) {
      if (isCert && isInvalidPromoError(e)) {
        setPromo(null);
        notify(promoReasonLabel(e?.data?.reason), "error");
        setBusy(false);
        return;
      }
      notify(e?.message || t("merchant.error"), "error");
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={isCert ? "Payer le certificat" : t("pay.title")}
      onClose={busy ? undefined : close}
    >
      {step === "form" ? (
        <div className="pay-form">
          <p className="pay-amount">
            {isCert ? `Montant : ${amount}` : t("pay.amount", { amount })}
          </p>
          {isCert && (
            <PromoCodeField
              kind="cert"
              amountUsd={amountOf(amount)}
              applied={promo}
              onApply={setPromo}
              disabled={busy}
            />
          )}
          <span className="ui-field-label">{t("pay.operator")}</span>
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
          <Field label={t("pay.phone")} hint={t("pay.phoneHint")}>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="2439XXXXXXXX"
              inputMode="tel"
            />
          </Field>
          {onCopyLink && (
            <button
              type="button"
              className="pay-copy-link"
              onClick={() => onCopyLink(promo?.code || "")}
              disabled={busy}
            >
              Ou envoyer un lien de paiement (messagerie ou SMS)
            </button>
          )}
          <div className="ui-modal-foot">
            <Button variant="ghost" onClick={close} disabled={busy}>
              {t("form.cancel")}
            </Button>
            <Button variant="primary" onClick={pay} disabled={busy}>
              {isCert && promoTotal(amountOf(amount), promo) != null
                ? `${t("pay.pay")} ${promoTotal(amountOf(amount), promo).toLocaleString("fr-FR")} $`
                : t("pay.pay")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="pay-pending">
          <Spinner label={t("pay.pending")} />
          {isCert && charged && <p className="pay-amount">Montant : {charged}</p>}
          <p className="pay-pending-hint">{t("pay.pendingHint")}</p>
        </div>
      )}
    </Modal>
  );
}
