const SECTION_COLORS = [
  '#dbeafe',
  '#dcfce7',
  '#fef3c7',
  '#fce7f3',
  '#ede9fe',
  '#ffedd5',
  '#ccfbf1',
  '#fee2e2',
  '#e0f2fe',
  '#ecfccb',
  '#fae8ff',
  '#f3e8d4',
]

export const getSectionColors = (gridByKey) => {
  const sections = new Map()

  Object.values(gridByKey).forEach((cell) => {
    if (cell.sectionId == null) return

    const sectionId = String(cell.sectionId)
    if (!sections.has(sectionId)) {
      sections.set(sectionId, {
        sectionId,
        name: cell.section,
      })
    }
  })

  return [...sections.values()]
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map((section, index) => ({
      ...section,
      color: SECTION_COLORS[index % SECTION_COLORS.length],
    }))
}
