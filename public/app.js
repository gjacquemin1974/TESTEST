// UPDATED app.js with selection + delete

const selectedIds = new Set()

function bindCheckboxEvents() {
  document.querySelectorAll('.row-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = Number(e.target.dataset.id)
      if (e.target.checked) selectedIds.add(id)
      else selectedIds.delete(id)
    })
  })
}

async function deleteSelectedResources() {
  const ids = Array.from(selectedIds)
  if (!ids.length) return

  if (!confirm(`Supprimer ${ids.length} ressource(s) ?`)) return

  await fetch('/api/resources/bulk-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  })

  selectedIds.clear()
  location.reload()
}
