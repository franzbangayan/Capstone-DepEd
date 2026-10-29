const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

const printStyles = `
  @page { size: landscape; margin: 0.35in; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #1f2933; font-family: Georgia, 'Times New Roman', serif; }
  .sheet { width: 100%; }
  .letterhead { text-align: center; border-bottom: 2px solid #1f2933; padding-bottom: 12px; margin-bottom: 16px; }
  .letterhead h1 { margin: 0; font-size: 20px; }
  .letterhead p { margin: 4px 0 0; color: #52606d; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px; }
  th, td { border: 1px solid #9ca3af; text-align: center; vertical-align: middle; padding: 5px 3px; }
  th { background: #f1f5f9; font-weight: 700; }
  .time { width: 105px; background: #f8fafc; font-weight: 700; white-space: nowrap; }
  .cell { height: 47px; color: #9aa5b1; }
  .filled { background: #eff6ff; color: #1f2933; }
  .subject { font-weight: 700; }
  .meta { color: #52606d; font-size: 9px; margin-top: 2px; }
  .break { background: #f1f5f9; color: #6b7280; font-style: italic; }
  .empty { margin-top: 14px; text-align: center; color: #6b7280; font-style: italic; }
`

const formatTime = (value) => {
  const [hours, minutes] = String(value).split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 === 0 ? 12 : hours % 12
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
}

export const printSchedule = ({ title, subtitle, days, periods, gridByKey, totalPeriods, emptyMessage }) => {
  const printWindow = window.open('', '_blank', 'width=1200,height=900')
  if (!printWindow) {
    window.alert('Please allow pop-ups to print the schedule.')
    return
  }

  const header = days.map((day) => `<th>${escapeHtml(day)}</th>`).join('')
  const rows = periods.map((period) => {
    const time = `${formatTime(period.start)}–${formatTime(period.end)}`
    if (period.isBreak) {
      return `<tr><td class="time">${time}</td><td class="break" colspan="${days.length}">Break</td></tr>`
    }

    const cells = days.map((day) => {
      const cell = gridByKey[`${day}|${period.start}`]
      if (!cell) return '<td class="cell">—</td>'
      return `<td class="cell filled"><div class="subject">${escapeHtml(cell.subject)}</div><div class="meta">${escapeHtml(cell.section || cell.teacher)}</div><div class="meta">${escapeHtml(cell.room)}</div></td>`
    }).join('')
    return `<tr><td class="time">${time}</td>${cells}</tr>`
  }).join('')

  const empty = totalPeriods === 0
    ? `<div class="empty">${escapeHtml(emptyMessage)}</div>`
    : ''

  printWindow.document.open()
  printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)} Schedule</title><style>${printStyles}</style></head><body><main class="sheet"><div class="letterhead"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div><table><thead><tr><th class="time">Time</th>${header}</tr></thead><tbody>${rows}</tbody></table>${empty}</main></body></html>`)
  printWindow.document.close()
  printWindow.focus()

  printWindow.addEventListener('load', () => {
    printWindow.print()
  }, { once: true })
}
