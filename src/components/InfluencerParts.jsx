import { Badge } from "./ui.jsx";
import { usePaged } from "./usePaged";
import { Pagination } from "./Pagination.jsx";
import {
  SOURCE_LABEL,
  arr,
  earnStatusOf,
  fmtDate,
  num,
  pctOf,
  txt,
  usd,
} from "./influencerCommon";

/** Tableau des gains d'un influenceur (back-office et espace commerçant). */
export function EarningsTable({ earnings, size = 8 }) {
  const list = arr(earnings);
  const { pageItems, page, setPage, totalPages, count } = usePaged(list, size);
  if (!list.length) {
    return <p className="dash-sub">Aucun gain pour le moment.</p>;
  }
  return (
    <>
      <div className="cat-table-wrap">
        <table className="cat-table infl-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Origine</th>
              <th>Base</th>
              <th>Part</th>
              <th>Gain</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((e, i) => {
              const st = earnStatusOf(e?.status);
              return (
                <tr key={txt(e?.id) || i}>
                  <td>{fmtDate(e?.createdAt)}</td>
                  <td>{SOURCE_LABEL[e?.source] || txt(e?.source) || "·"}</td>
                  <td>{usd(e?.baseUsd)}</td>
                  <td>{e?.rate != null ? `${pctOf(e.rate)} %` : "·"}</td>
                  <td>
                    <b>{usd(e?.amountUsd)}</b>
                  </td>
                  <td>
                    <span title={st.hint}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} count={count} onChange={setPage} />
      <p className="infl-legend">
        <b>En attente</b> : la commission de la vente n'est pas encore encaissée
        par Tindisa. <b>Acquis</b> : prêt à être versé. <b>Versé</b> : déjà payé.
      </p>
    </>
  );
}

/** Indicateurs de gains (cumul, en attente, acquis, versé, solde). */
export function EarningsStats({ stats }) {
  const s = stats && typeof stats === "object" ? stats : {};
  const items = [
    { k: "earned", label: "Gains cumulés", v: s.earnedUsd },
    { k: "pending", label: "En attente", v: s.pendingUsd },
    { k: "acquired", label: "Acquis", v: s.acquiredUsd },
    { k: "paid", label: "Déjà versés", v: s.paidUsd },
    { k: "balance", label: "Solde à verser", v: s.balanceUsd, strong: true },
  ];
  return (
    <div className="metric-grid infl-metrics">
      {s.uses != null && (
        <div className="metric-item">
          <span className="dash-stat-label">Utilisations</span>
          <span className="infl-metric-v">{num(s.uses).toLocaleString("fr-FR")}</span>
        </div>
      )}
      {items.map((it) => (
        <div key={it.k} className={`metric-item${it.strong ? " infl-strong" : ""}`}>
          <span className="dash-stat-label">{it.label}</span>
          <span className="infl-metric-v">{usd(it.v)}</span>
        </div>
      ))}
    </div>
  );
}
