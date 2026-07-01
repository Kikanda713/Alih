/**
 * Export de données (back-office) — CSV natif + XLSX via SheetJS chargé EN
 * DYNAMIQUE (import()) pour ne pas alourdir le bundle principal (only-on-click,
 * côté admin). `columns` = [{ key, label, map? }]. `rows` = objets.
 */
function toCell(row, col) {
  const v = col.map ? col.map(row) : row[col.key]
  return v == null ? '' : v
}

function stamp() {
  // Suffixe date pour le nom de fichier (AAAA-MM-JJ).
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Export CSV (séparateur ';' pour Excel FR, BOM UTF-8 pour les accents). */
export function exportCSV(baseName, columns, rows) {
  const esc = (val) => {
    const s = String(val).replace(/"/g, '""')
    return /[";\n]/.test(s) ? `"${s}"` : s
  }
  const header = columns.map((c) => esc(c.label)).join(';')
  const lines = rows.map((r) => columns.map((c) => esc(toCell(r, c))).join(';'))
  const csv = '﻿' + [header, ...lines].join('\r\n')
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${baseName}-${stamp()}.csv`)
}

/** Export XLSX (SheetJS en import dynamique — non embarqué dans le bundle). */
export async function exportXLSX(baseName, columns, rows, sheetName = 'Données') {
  const XLSX = await import('xlsx')
  const data = rows.map((r) => {
    const o = {}
    for (const c of columns) o[c.label] = toCell(r, c)
    return o
  })
  const ws = XLSX.utils.json_to_sheet(data, { header: columns.map((c) => c.label) })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))
  XLSX.writeFile(wb, `${baseName}-${stamp()}.xlsx`)
}
