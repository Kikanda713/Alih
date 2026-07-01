import { useState } from 'react'
import { FaFileCsv, FaFileExcel } from 'react-icons/fa'
import { exportCSV, exportXLSX } from '../utils/exportData'

/**
 * Boutons d'extraction (back-office) : Excel (.xlsx) + CSV.
 * props: baseName (nom fichier), columns [{key,label,map?}], rows, disabled.
 */
export default function ExportButtons({ baseName, columns, rows, sheetName }) {
  const [busy, setBusy] = useState('')
  const empty = !rows || rows.length === 0
  const doXlsx = async () => {
    setBusy('xlsx')
    try { await exportXLSX(baseName, columns, rows, sheetName) } finally { setBusy('') }
  }
  return (
    <div className="export-btns">
      <button className="export-btn" onClick={doXlsx} disabled={empty || busy} title="Exporter en Excel (.xlsx)">
        <FaFileExcel /> {busy === 'xlsx' ? 'Export…' : 'Excel'}
      </button>
      <button className="export-btn" onClick={() => exportCSV(baseName, columns, rows)} disabled={empty} title="Exporter en CSV">
        <FaFileCsv /> CSV
      </button>
    </div>
  )
}
