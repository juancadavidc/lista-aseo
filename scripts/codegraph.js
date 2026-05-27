#!/usr/bin/env node
// scripts/codegraph.js
// Escanea el servidor (rutas, middlewares, queries) y el schema (db/init.sql)
// y genera un grafo: API -> Handler -> SQL + indice inverso Tabla -> Endpoints.
//
// Salidas:
//   .claude/code-graph.json  (estructurado, para Claude)
//   docs/CODE_GRAPH.md       (legible, con tabla de violaciones multi-tenant)
//
// Uso: npm run codegraph

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ---------- IO helpers ----------
function readFile(p) {
  return fs.readFileSync(p, 'utf8')
}

function writeFile(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, content)
}

function lineOf(src, pos) {
  let line = 1
  for (let i = 0; i < pos && i < src.length; i++) if (src[i] === '\n') line++
  return line
}

// ---------- Source masking ----------
// Devuelve una copia del codigo donde el contenido de strings y comentarios
// se reemplaza por espacios/saltos de linea, preservando posiciones.
// Asi podemos correr regex sobre las posiciones sin matchear texto dentro de
// strings o comentarios.
function maskSource(src) {
  const out = new Array(src.length).fill(' ')
  const blank = (i) => { out[i] = src[i] === '\n' ? '\n' : ' ' }
  let i = 0
  while (i < src.length) {
    const c = src[i]
    const n = src[i + 1]
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') { blank(i); i++ }
      continue
    }
    if (c === '/' && n === '*') {
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { blank(i); i++ }
      if (i < src.length) { blank(i); blank(i + 1); i += 2 }
      continue
    }
    if (c === "'" || c === '"') {
      out[i] = c; i++
      while (i < src.length) {
        if (src[i] === '\\') { blank(i); if (i + 1 < src.length) blank(i + 1); i += 2; continue }
        if (src[i] === c) { out[i] = c; i++; break }
        blank(i); i++
      }
      continue
    }
    if (c === '`') {
      out[i] = '`'; i++
      while (i < src.length) {
        if (src[i] === '\\') { blank(i); if (i + 1 < src.length) blank(i + 1); i += 2; continue }
        if (src[i] === '`') { out[i] = '`'; i++; break }
        if (src[i] === '$' && src[i + 1] === '{') {
          out[i] = '$'; out[i + 1] = '{'; i += 2
          let depth = 1
          while (i < src.length && depth > 0) {
            const cc = src[i]
            if (cc === '"' || cc === "'") {
              out[i] = cc; i++
              while (i < src.length) {
                if (src[i] === '\\') { blank(i); if (i + 1 < src.length) blank(i + 1); i += 2; continue }
                if (src[i] === cc) { out[i] = cc; i++; break }
                blank(i); i++
              }
              continue
            }
            if (cc === '{') { depth++; out[i] = '{'; i++; continue }
            if (cc === '}') {
              depth--
              out[i] = '}'; i++
              if (depth === 0) break
              continue
            }
            out[i] = cc; i++
          }
          continue
        }
        blank(i); i++
      }
      continue
    }
    out[i] = c; i++
  }
  return out.join('')
}

function findMatching(masked, openPos, openCh, closeCh) {
  let depth = 0
  for (let i = openPos; i < masked.length; i++) {
    if (masked[i] === openCh) depth++
    else if (masked[i] === closeCh) {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function splitArgs(masked, openParen, closeParen) {
  const result = []
  let start = openParen + 1
  let depth = 0
  for (let i = openParen + 1; i < closeParen; i++) {
    const c = masked[i]
    if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') depth--
    else if (c === ',' && depth === 0) {
      result.push({ start, end: i })
      start = i + 1
    }
  }
  result.push({ start, end: closeParen })
  return result
}

function findFirstQuote(masked, start, end) {
  for (let i = start; i < end; i++) {
    const c = masked[i]
    if (c === "'" || c === '"' || c === '`') return i
  }
  return -1
}

function extractStringAt(src, masked, quotePos) {
  const q = masked[quotePos]
  if (q !== "'" && q !== '"' && q !== '`') return null
  for (let i = quotePos + 1; i < masked.length; i++) {
    if (masked[i] === q) return src.slice(quotePos + 1, i)
  }
  return null
}

// ---------- Schema parsing ----------
const SQL_TYPES = /^(UUID|TEXT|INTEGER|BOOLEAN|TIMESTAMPTZ|TIMESTAMP|VARCHAR|BIGINT|JSONB|JSON|NUMERIC|DECIMAL|SERIAL|BIGSERIAL|DATE|TIME|SMALLINT|BYTEA|CHAR)/i

function parseSchema(sql, into = {}, source = null) {
  const tables = into
  // Acepta tanto `\n);` (formato init.sql) como `\n      )` (CREATE inline en JS template)
  const re = /CREATE TABLE (?:IF NOT EXISTS )?(\w+)\s*\(([\s\S]*?)\n\s*\)/g
  let m
  while ((m = re.exec(sql))) {
    const [, name, body] = m
    const columns = []
    const fks = []
    const lines = body.split('\n').map(l => l.trim().replace(/,\s*$/, '')).filter(Boolean)
    for (const line of lines) {
      if (line.startsWith('--')) continue
      if (/^(UNIQUE|PRIMARY|CHECK|FOREIGN|CONSTRAINT)\b/i.test(line)) continue
      const colMatch = line.match(/^(\w+)\s+(\S+)/)
      if (colMatch && SQL_TYPES.test(colMatch[2])) {
        const col = colMatch[1]
        const type = colMatch[2].replace(/,$/, '')
        columns.push({ name: col, type })
        const fk = line.match(/REFERENCES\s+(\w+)\s*\((\w+)\)/i)
        if (fk) fks.push({ column: col, refTable: fk[1], refColumn: fk[2] })
      }
    }
    if (!tables[name]) {
      tables[name] = {
        columns,
        fks,
        hasOrgId: columns.some(c => c.name === 'organization_id'),
        source: source || 'db/init.sql',
      }
    }
  }
  return tables
}

// ---------- SQL analysis ----------
const PG_SYSTEM_SCHEMAS = new Set(['information_schema', 'pg_catalog', 'pg_temp', 'pg_toast'])
const SQL_KEYWORDS_NOT_TABLES = new Set(['SET', 'WHERE', 'AS', 'ON', 'SELECT', 'VALUES', 'TABLE', 'INDEX'])

function analyzeSql(sql) {
  const flat = sql.replace(/\s+/g, ' ').trim()
  const opMatch = flat.match(/^(SELECT|INSERT|UPDATE|DELETE|BEGIN|COMMIT|ROLLBACK|WITH|DO|CREATE|DROP|ALTER|SET)\b/i)
  const op = opMatch ? opMatch[1].toUpperCase() : 'OTHER'
  const tables = new Set()
  // Captura opcionalmente un prefijo de schema: information_schema.columns -> table = columns, schema = information_schema
  const tRe = /(?:FROM|JOIN|INTO|UPDATE)\s+(?:("?[A-Za-z_][A-Za-z0-9_]*"?)\.)?("?[A-Za-z_][A-Za-z0-9_]*"?)/gi
  let tm
  while ((tm = tRe.exec(flat))) {
    const schema = tm[1] ? tm[1].replace(/"/g, '') : null
    const raw = tm[2].replace(/"/g, '')
    if (SQL_KEYWORDS_NOT_TABLES.has(raw.toUpperCase())) continue
    if (schema && PG_SYSTEM_SCHEMAS.has(schema.toLowerCase())) continue
    tables.add(raw)
  }
  const filtersByOrgId = /\borganization_id\b/.test(flat) || /"organizationId"/.test(flat)
  return { op, tables: [...tables], filtersByOrgId }
}

// ---------- Route extraction ----------
const ROUTE_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'all']
const QUERY_CLIENTS = ['pool', 'client', 'db', 'trx', 'tx']

function extractQueriesInRange(src, masked, from, to) {
  const queries = []
  const re = new RegExp(`\\b(${QUERY_CLIENTS.join('|')})\\.query\\s*\\(`, 'g')
  re.lastIndex = from
  let m
  while ((m = re.exec(masked)) && m.index < to) {
    const openParen = m.index + m[0].length - 1
    const closeParen = findMatching(masked, openParen, '(', ')')
    if (closeParen === -1) continue
    let cursor = openParen + 1
    while (cursor < closeParen && /\s/.test(masked[cursor])) cursor++
    const isString = masked[cursor] === "'" || masked[cursor] === '"' || masked[cursor] === '`'
    if (!isString) {
      // Query dinamica: SQL construido en una variable. Anotar sin tablas.
      queries.push({
        line: lineOf(src, m.index),
        client: m[1],
        dynamic: true,
        sql: null,
        op: 'DYNAMIC',
        tables: [],
        filtersByOrgId: false,
      })
      continue
    }
    const sql = extractStringAt(src, masked, cursor)
    if (sql === null) continue
    const meta = analyzeSql(sql)
    queries.push({
      line: lineOf(src, m.index),
      client: m[1],
      dynamic: false,
      sql: sql.trim(),
      ...meta,
    })
  }
  return queries
}

function parseRoutes(src, masked, filePath) {
  const routes = []
  const bodyRanges = []
  const re = new RegExp(`\\bapp\\.(${ROUTE_METHODS.join('|')})\\s*\\(`, 'g')
  let m
  while ((m = re.exec(masked))) {
    const method = m[1].toUpperCase()
    const openParen = m.index + m[0].length - 1
    const closeParen = findMatching(masked, openParen, '(', ')')
    if (closeParen === -1) continue

    const args = splitArgs(masked, openParen, closeParen)
    if (args.length === 0) continue

    const pathQuote = findFirstQuote(masked, args[0].start, args[0].end)
    if (pathQuote === -1) continue
    const pathStr = extractStringAt(src, masked, pathQuote)
    if (!pathStr || !pathStr.startsWith('/')) continue

    const middlewareArgs = args.slice(1, -1)
    const middlewares = middlewareArgs.map(a => src.slice(a.start, a.end).trim().replace(/\s+/g, ' ')).filter(Boolean)

    const handler = args[args.length - 1]
    let bodyOpen = -1
    let depth = 0
    for (let i = handler.start; i < handler.end; i++) {
      const c = masked[i]
      if (c === '(' || c === '[') depth++
      else if (c === ')' || c === ']') depth--
      else if (c === '{' && depth === 0) { bodyOpen = i; break }
    }
    let queries = []
    if (bodyOpen !== -1) {
      const bodyClose = findMatching(masked, bodyOpen, '{', '}')
      if (bodyClose !== -1) {
        queries = extractQueriesInRange(src, masked, bodyOpen, bodyClose)
        bodyRanges.push([bodyOpen, bodyClose])
      }
    }

    routes.push({
      file: filePath,
      method,
      path: pathStr,
      line: lineOf(src, m.index),
      middlewares,
      queries,
    })
  }
  return { routes, bodyRanges }
}

// ---------- Helper / factory extraction ----------
// Captura funciones nombradas (function NAME, const NAME = () => ...) en cualquier
// nivel y extrae sus queries. Cada query se atribuye SOLO al cuerpo mas chico que
// la contiene, evitando doble conteo cuando una factory envuelve a otra funcion.
// Las queries que caen dentro de un handler de ruta (rango ya cubierto por
// parseRoutes) se excluyen via `routeBodyRanges`.
function parseHelpers(src, masked, filePath, routeBodyRanges = []) {
  const candidates = []
  const seen = new Set()
  const addCandidate = (name, headerStart, bodyOpen) => {
    if (bodyOpen === -1) return
    const bodyClose = findMatching(masked, bodyOpen, '{', '}')
    if (bodyClose === -1) return
    const key = `${name}:${headerStart}:${bodyOpen}`
    if (seen.has(key)) return
    seen.add(key)
    candidates.push({ name, headerStart, bodyOpen, bodyClose })
  }

  // 1) function NAME(...)  (con cualquier combo de export/async)
  const fnRe = /\b(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g
  let m
  while ((m = fnRe.exec(masked))) {
    const openParen = m.index + m[0].length - 1
    const closeParen = findMatching(masked, openParen, '(', ')')
    if (closeParen === -1) continue
    let i = closeParen + 1
    while (i < masked.length && /\s/.test(masked[i])) i++
    if (masked[i] !== '{') continue
    addCandidate(m[1], m.index, i)
  }

  // 2) const NAME = (...) => { ... }
  const arrowRe = /\b(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?\(/g
  while ((m = arrowRe.exec(masked))) {
    const openParen = m.index + m[0].length - 1
    const closeParen = findMatching(masked, openParen, '(', ')')
    if (closeParen === -1) continue
    let i = closeParen + 1
    while (i < masked.length && /\s/.test(masked[i])) i++
    if (masked[i] !== '=' || masked[i + 1] !== '>') continue
    i += 2
    while (i < masked.length && /\s/.test(masked[i])) i++
    if (masked[i] !== '{') continue
    addCandidate(m[1], m.index, i)
  }

  // Para cada query del archivo, encontrar la candidata mas chica que la contiene
  const allQueries = extractQueriesInRange(src, masked, 0, masked.length)
  const sorted = [...candidates].sort((a, b) => (a.bodyClose - a.bodyOpen) - (b.bodyClose - b.bodyOpen))
  const byCandidate = new Map()
  for (const q of allQueries) {
    // Buscar query position usando line para localizar (aproximado pero suficiente)
    // Mejor: extractQueriesInRange devuelve la linea; necesitamos posicion. Reconstruir:
    // Solucion: usar la regex de nuevo para obtener posiciones, mapeando 1:1.
  }
  // Mejor enfoque: re-escanear queries con posiciones
  const re = new RegExp(`\\b(${QUERY_CLIENTS.join('|')})\\.query\\s*\\(`, 'g')
  let qm
  while ((qm = re.exec(masked))) {
    const pos = qm.index
    // Skip si esta dentro de un handler de ruta
    if (routeBodyRanges.some(([s, e]) => pos >= s && pos <= e)) continue
    // Buscar la candidata mas chica que contiene pos
    const owner = sorted.find(c => pos >= c.bodyOpen && pos <= c.bodyClose)
    if (!owner) continue
    if (!byCandidate.has(owner)) byCandidate.set(owner, [])
    byCandidate.get(owner).push(pos)
  }

  const helpers = []
  for (const cand of candidates) {
    const positions = byCandidate.get(cand)
    if (!positions || positions.length === 0) continue
    // Re-extraer queries en el cuerpo y filtrar por posiciones asignadas
    const allInBody = extractQueriesInRangeWithPos(src, masked, cand.bodyOpen, cand.bodyClose)
    const queries = allInBody.filter(q => positions.includes(q.pos)).map(({ pos, ...rest }) => rest)
    if (queries.length === 0) continue
    helpers.push({
      name: cand.name,
      file: filePath,
      line: lineOf(src, cand.headerStart),
      queries,
    })
  }
  return helpers
}

// Variante de extractQueriesInRange que incluye la posicion absoluta de cada query.
function extractQueriesInRangeWithPos(src, masked, from, to) {
  const queries = []
  const re = new RegExp(`\\b(${QUERY_CLIENTS.join('|')})\\.query\\s*\\(`, 'g')
  re.lastIndex = from
  let m
  while ((m = re.exec(masked)) && m.index < to) {
    const pos = m.index
    const openParen = pos + m[0].length - 1
    const closeParen = findMatching(masked, openParen, '(', ')')
    if (closeParen === -1) continue
    let cursor = openParen + 1
    while (cursor < closeParen && /\s/.test(masked[cursor])) cursor++
    const isString = masked[cursor] === "'" || masked[cursor] === '"' || masked[cursor] === '`'
    if (!isString) {
      queries.push({
        pos,
        line: lineOf(src, pos),
        client: m[1],
        dynamic: true,
        sql: null,
        op: 'DYNAMIC',
        tables: [],
        filtersByOrgId: false,
      })
      continue
    }
    const sql = extractStringAt(src, masked, cursor)
    if (sql === null) continue
    const meta = analyzeSql(sql)
    queries.push({
      pos,
      line: lineOf(src, pos),
      client: m[1],
      dynamic: false,
      sql: sql.trim(),
      ...meta,
    })
  }
  return queries
}

// ---------- Inverted index ----------
function buildTableIndex(routes, helpers, schema) {
  const idx = {}
  const ensure = (t) => {
    if (!idx[t]) {
      idx[t] = {
        defined: t in schema,
        schema: schema[t] || null,
        readers: [],
        writers: [],
      }
    }
    return idx[t]
  }
  for (const name of Object.keys(schema)) ensure(name)

  const isWrite = (op) => ['INSERT', 'UPDATE', 'DELETE'].includes(op)
  const record = (table, op, ref) => {
    const e = ensure(table)
    if (isWrite(op)) e.writers.push(ref)
    else e.readers.push(ref)
  }

  for (const r of routes) {
    for (const q of r.queries) {
      if (!q.tables.length) continue
      const ref = {
        kind: 'route',
        method: r.method,
        path: r.path,
        file: r.file,
        line: q.line,
        op: q.op,
        filtersByOrgId: q.filtersByOrgId,
      }
      for (const t of q.tables) record(t, q.op, ref)
    }
  }
  for (const h of helpers) {
    for (const q of h.queries) {
      if (!q.tables.length) continue
      const ref = {
        kind: 'helper',
        helper: h.name,
        file: h.file,
        line: q.line,
        op: q.op,
        filtersByOrgId: q.filtersByOrgId,
      }
      for (const t of q.tables) record(t, q.op, ref)
    }
  }
  return idx
}

// ---------- Output ----------
function basename(p) {
  return p.split('/').pop()
}

function renderMarkdown(graph) {
  const { routes, helpers, schema, tableIndex, generatedAt } = graph
  const lines = []
  lines.push('# Code Graph — Casa Limpia')
  lines.push('')
  lines.push(`_Generado automaticamente por \`scripts/codegraph.js\` el ${generatedAt}._`)
  lines.push('')
  lines.push('**No editar a mano.** Regenerar con `npm run codegraph` despues de cambios en `server/` o `db/init.sql`.')
  lines.push('')

  const totalQueries = routes.reduce((a, r) => a + r.queries.length, 0)
  const orgGuarded = routes.flatMap(r => r.queries).filter(q => q.filtersByOrgId).length
  const dynamicCount = routes.flatMap(r => r.queries).filter(q => q.dynamic).length

  lines.push('## Resumen')
  lines.push('')
  lines.push(`| Metrica | Valor |`)
  lines.push(`|---|---|`)
  lines.push(`| Rutas registradas | ${routes.length} |`)
  lines.push(`| Queries en rutas (estaticas) | ${totalQueries - dynamicCount} |`)
  lines.push(`| Queries dinamicas (SQL en variable) | ${dynamicCount} |`)
  lines.push(`| Queries con filtro \`organization_id\` | ${orgGuarded} |`)
  lines.push(`| Helpers con queries | ${helpers.length} |`)
  lines.push(`| Tablas en schema | ${Object.keys(schema).length} |`)
  lines.push(`| Tablas referenciadas (incl. externas) | ${Object.keys(tableIndex).length} |`)
  lines.push('')

  // Multi-tenant warnings
  const warnings = []
  for (const r of routes) {
    for (const q of r.queries) {
      if (q.dynamic) continue
      if (['BEGIN', 'COMMIT', 'ROLLBACK', 'SET'].includes(q.op)) continue
      const orgTables = q.tables.filter(t => schema[t]?.hasOrgId)
      if (orgTables.length > 0 && !q.filtersByOrgId) {
        warnings.push({ r, q, orgTables })
      }
    }
  }
  if (warnings.length > 0) {
    lines.push('## Queries sin filtro multi-tenant (revisar)')
    lines.push('')
    lines.push('Queries que tocan tablas con `organization_id` pero no lo filtran:')
    lines.push('')
    for (const { r, q, orgTables } of warnings) {
      lines.push(`- \`${r.method} ${r.path}\` (${r.file}:${q.line}) — ${q.op} \`${orgTables.join(', ')}\``)
    }
    lines.push('')
  }

  // Routes grouped
  lines.push('## API → Handler → SQL')
  lines.push('')
  const grouped = {}
  for (const r of routes) {
    const parts = r.path.split('/').filter(Boolean)
    const key = parts[1] || parts[0] || 'misc'
    grouped[key] ||= []
    grouped[key].push(r)
  }
  for (const key of Object.keys(grouped).sort()) {
    lines.push(`### /api/${key}`)
    lines.push('')
    for (const r of grouped[key]) {
      const mw = r.middlewares.length ? ` _[${r.middlewares.join(', ')}]_` : ''
      lines.push(`**\`${r.method} ${r.path}\`** — ${r.file}:${r.line}${mw}`)
      lines.push('')
      if (r.queries.length === 0) {
        lines.push('- _Sin queries directas._')
      } else {
        for (const q of r.queries) {
          if (q.dynamic) {
            lines.push(`- L${q.line} _dynamic SQL (\`${q.client}.query(variable)\`)_`)
            continue
          }
          const orgTables = q.tables.filter(t => schema[t]?.hasOrgId)
          const flag = orgTables.length > 0
            ? (q.filtersByOrgId ? '[OK] ' : '[!!] ')
            : '     '
          const tables = q.tables.length ? ` → \`${q.tables.join(', ')}\`` : ''
          lines.push(`- ${flag}L${q.line} ${q.op}${tables}`)
        }
      }
      lines.push('')
    }
  }

  if (helpers.length > 0) {
    lines.push('## Helpers / factories con queries')
    lines.push('')
    for (const h of helpers) {
      lines.push(`**\`${h.name}\`** — ${h.file}:${h.line}`)
      lines.push('')
      for (const q of h.queries) {
        if (q.dynamic) {
          lines.push(`- L${q.line} _dynamic SQL_`)
          continue
        }
        const tables = q.tables.length ? ` → \`${q.tables.join(', ')}\`` : ''
        lines.push(`- L${q.line} ${q.op}${tables}${q.filtersByOrgId ? ' (filtra org)' : ''}`)
      }
      lines.push('')
    }
  }

  // Tables -> endpoints
  lines.push('## Tablas → Endpoints')
  lines.push('')
  for (const name of Object.keys(tableIndex).sort()) {
    const t = tableIndex[name]
    const tag = t.defined ? '' : ' _(externa — better-auth u otra fuente)_'
    lines.push(`### \`${name}\`${tag}`)
    lines.push('')
    if (t.schema) {
      const colSummary = t.schema.columns.map(c => `\`${c.name}\` ${c.type}`).join(', ')
      lines.push(`- **Columnas:** ${colSummary}`)
      if (t.schema.fks.length) {
        lines.push(`- **FK:** ${t.schema.fks.map(f => `\`${f.column}\` → \`${f.refTable}.${f.refColumn}\``).join(', ')}`)
      }
      lines.push(`- **Multi-tenant:** ${t.schema.hasOrgId ? 'si (organization_id)' : 'no'}`)
    }
    if (t.readers.length > 0) {
      lines.push(`- **Lectores (${t.readers.length}):**`)
      for (const r of t.readers) lines.push(`    - ${formatRef(r)}`)
    }
    if (t.writers.length > 0) {
      lines.push(`- **Escritores (${t.writers.length}):**`)
      for (const w of t.writers) lines.push(`    - ${formatRef(w)}`)
    }
    if (t.readers.length === 0 && t.writers.length === 0) {
      lines.push('- _Sin queries detectadas._')
    }
    lines.push('')
  }

  return lines.join('\n') + '\n'
}

function formatRef(ref) {
  const guard = ref.filtersByOrgId ? '' : ' [sin filtro org]'
  if (ref.kind === 'route') {
    return `\`${ref.method} ${ref.path}\` (${ref.file}:${ref.line}, ${ref.op})${guard}`
  }
  return `helper \`${ref.helper}\` (${ref.file}:${ref.line}, ${ref.op})${guard}`
}

// ---------- Main ----------
function main() {
  const schemaPath = path.join(ROOT, 'db', 'init.sql')
  const schema = parseSchema(readFile(schemaPath))

  const serverFiles = [
    path.join(ROOT, 'server', 'index.js'),
    path.join(ROOT, 'server', 'auth.js'),
  ]
  const libDir = path.join(ROOT, 'server', 'lib')
  if (fs.existsSync(libDir)) {
    for (const f of fs.readdirSync(libDir).sort()) {
      if (f.endsWith('.js') && !f.endsWith('.test.js')) {
        serverFiles.push(path.join(libDir, f))
      }
    }
  }

  const routes = []
  const helpers = []
  for (const file of serverFiles) {
    const rel = path.relative(ROOT, file)
    const src = readFile(file)
    const masked = maskSource(src)
    const { routes: rs, bodyRanges } = parseRoutes(src, masked, rel)
    routes.push(...rs)
    helpers.push(...parseHelpers(src, masked, rel, bodyRanges))
  }

  // Pasada extra: buscar CREATE TABLE en las SQL extraidas (tablas creadas en runtime via migrate())
  const allQueries = [
    ...routes.flatMap(r => r.queries.map(q => ({ ...q, source: r.file }))),
    ...helpers.flatMap(h => h.queries.map(q => ({ ...q, source: h.file }))),
  ]
  for (const q of allQueries) {
    if (!q.sql || !/CREATE TABLE/i.test(q.sql)) continue
    parseSchema(q.sql, schema, `${q.source}:${q.line}`)
  }

  const tableIndex = buildTableIndex(routes, helpers, schema)
  const graph = {
    generatedAt: new Date().toISOString(),
    sources: serverFiles.map(f => path.relative(ROOT, f)).concat([path.relative(ROOT, schemaPath)]),
    schema,
    routes,
    helpers,
    tableIndex,
  }

  const jsonOut = path.join(ROOT, '.claude', 'code-graph.json')
  const mdOut = path.join(ROOT, 'docs', 'CODE_GRAPH.md')
  writeFile(jsonOut, JSON.stringify(graph, null, 2) + '\n')
  writeFile(mdOut, renderMarkdown(graph))

  const totalQueries = routes.reduce((a, r) => a + r.queries.length, 0)
  console.log(`OK ${routes.length} rutas, ${totalQueries} queries, ${helpers.length} helpers con queries, ${Object.keys(tableIndex).length} tablas`)
  console.log(`OK ${path.relative(ROOT, jsonOut)}`)
  console.log(`OK ${path.relative(ROOT, mdOut)}`)
}

main()
