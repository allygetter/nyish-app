export function generateQRData(member) {
  return JSON.stringify({
    id: member.id,
    name: member.name,
    phone: member.phone,
    role: member.role,
    status: member.status,
    verified: true,
  })
}

export function exportToCSV(filename, headers, rows) {
  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}
