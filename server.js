// UPDATED server.js with bulk delete
// (same content as provided earlier)

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

app.post('/api/resources/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Aucun id fourni' })
    }

    const normalizedIds = ids
      .map((id) => parseInt(id, 10))
      .filter((id) => Number.isInteger(id) && id > 0)

    if (normalizedIds.length === 0) {
      return res.status(400).json({ error: 'Ids invalides' })
    }

    if (usePostgres) {
      const placeholders = normalizedIds.map((_, i) => `$${i + 1}`).join(',')
      await pgPool.query(`DELETE FROM resources WHERE id IN (${placeholders})`, normalizedIds)
    } else {
      const placeholders = normalizedIds.map(() => '?').join(',')
      await runSql(`DELETE FROM resources WHERE id IN (${placeholders})`, normalizedIds)
    }

    res.json({ success: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erreur lors de la suppression' })
  }
})
