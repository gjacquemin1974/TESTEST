const state = {
  q: '',
  page: 1,
  totalPages: 1
}

const elements = {
  searchInput: document.getElementById('searchInput'),
  searchButton: document.getElementById('searchButton'),
  resetButton: document.getElementById('resetButton'),
  resourceTableBody: document.getElementById('resourceTableBody'),
  emptyState: document.getElementById('emptyState'),
  resultInfo: document.getElementById('resultInfo'),
  pageInfo: document.getElementById('pageInfo'),
  prevButton: document.getElementById('prevButton'),
  nextButton: document.getElementById('nextButton'),
  openFormButton: document.getElementById('openFormButton'),
  closeFormButton: document.getElementById('closeFormButton'),
  drawer: document.getElementById('drawer'),
  drawerBackdrop: document.getElementById('drawerBackdrop'),
  resourceForm: document.getElementById('resourceForm'),
  formMessage: document.getElementById('formMessage')
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('fr-FR')
}

function toggleDrawer(show) {
  elements.drawer.classList.toggle('hidden', !show)
  elements.drawerBackdrop.classList.toggle('hidden', !show)
}

function renderRows(items) {
  elements.resourceTableBody.innerHTML = ''

  if (!items.length) {
    elements.emptyState.classList.remove('hidden')
    return
  }

  elements.emptyState.classList.add('hidden')

  for (const item of items) {
    const row = document.createElement('tr')
    row.innerHTML = `
      <td>${item.id}</td>
      <td>${item.first_name}</td>
      <td>${item.last_name}</td>
      <td>${item.gender}</td>
      <td>${formatDate(item.created_at)}</td>
    `
    elements.resourceTableBody.appendChild(row)
  }
}

async function loadResources() {
  const params = new URLSearchParams({ page: state.page })
  if (state.q) params.set('q', state.q)

  const response = await fetch(`/api/resources?${params.toString()}`)
  const data = await response.json()

  renderRows(data.items)
  state.totalPages = data.totalPages
  elements.resultInfo.textContent = `${data.total} résultat(s)`
  elements.pageInfo.textContent = `Page ${data.page} / ${data.totalPages}`
  elements.prevButton.disabled = data.page <= 1
  elements.nextButton.disabled = data.page >= data.totalPages
}

async function createResource(event) {
  event.preventDefault()
  elements.formMessage.textContent = 'Création en cours...'

  const formData = new FormData(elements.resourceForm)
  const payload = Object.fromEntries(formData.entries())

  const response = await fetch('/api/resources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  const data = await response.json()

  if (!response.ok) {
    elements.formMessage.textContent = data.error || 'Erreur lors de la création'
    return
  }

  elements.formMessage.textContent = 'Ressource créée avec succès'
  elements.resourceForm.reset()
  state.page = 1
  await loadResources()
}

elements.searchButton.addEventListener('click', async () => {
  state.q = elements.searchInput.value.trim()
  state.page = 1
  await loadResources()
})

elements.resetButton.addEventListener('click', async () => {
  elements.searchInput.value = ''
  state.q = ''
  state.page = 1
  await loadResources()
})

elements.searchInput.addEventListener('keydown', async (event) => {
  if (event.key === 'Enter') {
    state.q = elements.searchInput.value.trim()
    state.page = 1
    await loadResources()
  }
})

elements.prevButton.addEventListener('click', async () => {
  if (state.page > 1) {
    state.page -= 1
    await loadResources()
  }
})

elements.nextButton.addEventListener('click', async () => {
  if (state.page < state.totalPages) {
    state.page += 1
    await loadResources()
  }
})

elements.openFormButton.addEventListener('click', () => toggleDrawer(true))

elements.closeFormButton.addEventListener('click', () => toggleDrawer(false))

elements.drawerBackdrop.addEventListener('click', () => toggleDrawer(false))

elements.resourceForm.addEventListener('submit', createResource)

loadResources().catch((error) => {
  console.error(error)
  elements.formMessage.textContent = 'Impossible de charger les ressources'
})
