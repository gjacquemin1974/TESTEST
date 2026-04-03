const express = require('express')
const path = require('path')
const sqlite3 = require('sqlite3').verbose()
const { Pool } = require('pg')

const app = express()
const PORT = process.env.PORT || 3000
const PAGE_SIZE = 20

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

const usePostgres = Boolean(process.env.DATABASE_URL)
let db
let pgPool

function normalizeGenre(genre) {
  const value = (genre || '').trim().toLowerCase()
  const allowed = ['homme', 'femme', 'autre']
  return allowed.includes(value) ? value : null
}

async function initDb() {
  if (usePostgres) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    })

    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS resources (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(120) NOT NULL,
        last_name VARCHAR(120) NOT NULL,
        gender VARCHAR(20) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    const { rows } = await pgPool.query('SELECT COUNT(*)::int AS count FROM resources')
    if (rows[0].count === 0) {
      await seedPostgres()
    }
  } else {
    db = new sqlite3.Database(path.join(__dirname, 'data.sqlite'))

    await runSql(`
      CREATE TABLE IF NOT EXISTS resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        gender TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    const row = await getSql('SELECT COUNT(*) AS count FROM resources')
    if (row.count === 0) {
      await seedSqlite()
    }
  }
}

function seedRows() {
  return [
    ['Jean', 'Dupont', 'homme'],
    ['Marie', 'Martin', 'femme'],
    ['Alex', 'Bernard', 'autre'],
    ['Sophie', 'Robert', 'femme'],
    ['Lucas', 'Petit', 'homme'],
    ['Emma', 'Moreau', 'femme'],
    ['Noah', 'Simon', 'homme'],
    ['Camille', 'Laurent', 'autre'],
    ['Lina', 'Michel', 'femme'],
    ['Hugo', 'Garcia', 'homme'],
    ['Sarah', 'Roux', 'femme'],
    ['Tom', 'Fournier', 'homme'],
    ['Nina', 'Girard', 'femme'],
    ['Malo', 'Andre', 'homme'],
    ['Lea', 'Lambert', 'femme'],
    ['Jules', 'Bonnet', 'homme'],
    ['Maya', 'Francois', 'femme'],
    ['Eli', 'Mercier', 'autre'],
    ['Chloe', 'Guerin', 'femme'],
    ['Leo', 'Faure', 'homme'],
    ['Iris', 'Muller', 'femme'],
    ['Nathan', 'Henry', 'homme'],
    ['Zoé', 'Roussel', 'femme'],
    ['Robin', 'Masson', 'autre'],
    ['Claire', 'Marchand', 'femme']
  ]
}

async function seedSqlite() {
  for (const row of seedRows()) {
    await runSql(
      'INSERT INTO resources (first_name, last_name, gender) VALUES (?, ?, ?)',
      row
    )
  }
}

async function seedPostgres() {
  for (const row of seedRows()) {
    await pgPool.query(
      'INSERT INTO resources (first_name, last_name, gender) VALUES ($1, $2, $3)',
      row
    )
  }
}

function runSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err)
      resolve(this)
    })
  })
}

function getSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err)
      resolve(row)
    })
  })
}

function allSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err)
      resolve(rows)
    })
  })
}

app.get('/api/resources', async (req, res) => {
  try {
    const q = (req.query.q || '').trim()
    const page = Math.max(parseInt(req.query.page || '1', 10), 1)
    const offset = (page - 1) * PAGE_SIZE

    if (usePostgres) {
      const search = `%${q.toLowerCase()}%`
      const whereClause = q
        ? `WHERE LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(gender, '')) LIKE $1`
        : ''

      const countQuery = q
        ? `SELECT COUNT(*)::int AS total FROM resources ${whereClause}`
        : 'SELECT COUNT(*)::int AS total FROM resources'

      const dataQuery = q
        ? `SELECT * FROM resources ${whereClause} ORDER BY id DESC LIMIT $2 OFFSET $3`
        : 'SELECT * FROM resources ORDER BY id DESC LIMIT $1 OFFSET $2'

      const countResult = q
        ? await pgPool.query(countQuery, [search])
        : await pgPool.query(countQuery)

      const dataResult = q
        ? await pgPool.query(dataQuery, [search, PAGE_SIZE, offset])
        : await pgPool.query(dataQuery, [PAGE_SIZE, offset])

      return res.json({
        items: dataResult.rows,
        total: countResult.rows[0].total,
        page,
        pageSize: PAGE_SIZE,
        totalPages: Math.max(Math.ceil(countResult.rows[0].total / PAGE_SIZE), 1)
      })
    }

    let whereClause = ''
    const params = []
    if (q) {
      whereClause = `WHERE LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(gender, '')) LIKE ?`
      params.push(`%${q.toLowerCase()}%`)
    }

    const totalRow = await getSql(`SELECT COUNT(*) AS total FROM resources ${whereClause}`, params)
    const rows = await allSql(
      `SELECT * FROM resources ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, PAGE_SIZE, offset]
    )

    res.json({
      items: rows,
      total: totalRow.total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.max(Math.ceil(totalRow.total / PAGE_SIZE), 1)
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erreur lors du chargement des ressources' })
  }
})

app.post('/api/resources', async (req, res) => {
  try {
    const firstName = (req.body.first_name || '').trim()
    const lastName = (req.body.last_name || '').trim()
    const gender = normalizeGenre(req.body.gender)

    if (!firstName || !lastName || !gender) {
      return res.status(400).json({ error: 'Nom, prénom et genre sont obligatoires' })
    }

    if (usePostgres) {
      const result = await pgPool.query(
        'INSERT INTO resources (first_name, last_name, gender) VALUES ($1, $2, $3) RETURNING *',
        [firstName, lastName, gender]
      )
      return res.status(201).json(result.rows[0])
    }

    const insert = await runSql(
      'INSERT INTO resources (first_name, last_name, gender) VALUES (?, ?, ?)',
      [firstName, lastName, gender]
    )
    const created = await getSql('SELECT * FROM resources WHERE id = ?', [insert.lastID])
    res.status(201).json(created)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erreur lors de la création de la ressource' })
  }
})

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Application disponible sur le port ${PORT}`)
      console.log(`Base active: ${usePostgres ? 'PostgreSQL' : 'SQLite'}`)
    })
  })
  .catch((error) => {
    console.error('Impossible de démarrer l\'application', error)
    process.exit(1)
  })
