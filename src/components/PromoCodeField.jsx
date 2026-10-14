import { useEffect, useEffectEvent, useState } from "react";
import { FaTag, FaCheckCircle } from "react-icons/fa";
import { Button, Input } from "./ui.jsx";
import { formatPrice } from "../market/lib/format.js";
import {
  checkPromo,
  discounted,
  getStoredPromo,
  normalizePromo,
  promoReasonLabel,
  storePromo,
} from "../api/promo";

/**
 * Champ « Code promo (facultatif) » d'une transaction.
 * - kind 'cert' : affiche la remise et le nouveau montant (amountUsd connu) ;
 * - kind 'sale' : confirme seulement « Code enregistré ».
 * `applied` = { code, discountRate, influencerName } | null (état tenu par le parent).
 * Pré-rempli depuis le lien d'influenceur (?promo=CODE) ou `initialCode`, et
 * vérifié automatiquement à l'ouverture.
 */
export default function PromoCodeField({
  kind = "cert",
  amountUsd = null,
  applied = null,
  onApply,
  initialCode = "",
  disabled = false,
}) {
  const [value, setValue] = useState(
    () => applied?.code || normalizePromo(initialCode) || getStoredPromo(),
  );
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const verify = async (code) => {
    const r = await checkPromo(code, kind);
    if (r.valid) {
      storePromo(r.code);
      setError("");
      onApply?.(r);
    } else {
      setError(promoReasonLabel(r.reason));
      onApply?.(null);
    }
  };

  // Vérification automatique du code pré-rempli (états écrits dans les rappels).
  const autoCheck = useEffectEvent(() => {
    if (!value || applied) return null;
    return verify(value).catch(() => {});
  });
  useEffect(() => {
    Promise.resolve().then(autoCheck);
  }, []);

  const apply = async () => {
    const code = normalizePromo(value);
    if (!code) {
      setError("Saisissez un code.");
      return;
    }
    setChecking(true);
    try {
      await verify(code);
    } catch (e) {
      setError(e?.message || "Vérification impossible pour le moment.");
    } finally {
      setChecking(false);
    }
  };

  const remove = () => {
    setValue("");
    setError("");
    storePromo("");
    onApply?.(null);
  };

  const calc = applied && kind === "cert" && amountUsd != null
    ? discounted(amountUsd, applied.discountRate)
    : null;
  const pct = applied ? Math.round((applied.discountRate || 0) * 1000) / 10 : 0;

  return (
    <div className="promo-field">
      <span className="ui-field-label">
        <FaTag /> Code promo (facultatif)
      </span>
      <div className="promo-row">
        <Input
          value={value}
          onChange={(e) => {
            setValue(normalizePromo(e.target.value));
            setError("");
            if (applied) onApply?.(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          placeholder="Ex. MAMA10"
          aria-label="Code promo"
          autoCapitalize="characters"
          disabled={disabled || checking}
        />
        {applied ? (
          <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={disabled}>
            Retirer
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={apply}
            disabled={disabled || checking || !value}
          >
            {checking ? "Vérification…" : "Appliquer"}
          </Button>
        )}
      </div>
      {error && <span className="ui-field-error">{error}</span>}
      {applied && (
        <div className="promo-ok" role="status">
          <FaCheckCircle />
          {kind === "cert" ? (
            <span>
              Code <b>{applied.code}</b> appliqué
              {applied.influencerName ? ` (${applied.influencerName})` : ""}.
              {pct > 0 ? ` Remise de ${pct} %` : " Aucune remise sur ce montant"}
              {calc && pct > 0 ? (
                <>
                  {" "}soit {formatPrice(calc.discount, "USD")}. Nouveau montant :{" "}
                  <b>{formatPrice(calc.total, "USD")}</b>
                </>
              ) : null}
              .
            </span>
          ) : (
            <span>
              Code enregistré : <b>{applied.code}</b>
              {applied.influencerName ? ` (${applied.influencerName})` : ""}.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
