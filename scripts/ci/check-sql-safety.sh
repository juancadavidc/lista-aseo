#!/usr/bin/env bash
# Falla si detecta interpolación de variables dentro de llamadas .query(`...${var}...`)
# en líneas AGREGADAS por el diff (no archivos enteros, para no flaggear código preexistente).
# Regla crítica #2 del CLAUDE.md: SQL SIEMPRE con parameterized queries ($1, $2...).
#
# Para escapar intencionalmente (ej. SQL controlado por código de migración o
# constantes del backend, no por usuario), agrega el comentario `// @allow-dynamic-sql`
# en la línea anterior o la misma línea.
set -euo pipefail

BASE_REF="${BASE_REF:-origin/main}"

mapfile -t FILES < <(git diff --name-only --diff-filter=ACMR "$BASE_REF"...HEAD -- 'server/**/*.js' 'server/*.js' 2>/dev/null || true)

if [ "${#FILES[@]}" -eq 0 ]; then
  echo "✓ SQL safety: sin cambios en server/, skip"
  exit 0
fi

python3 - "$BASE_REF" "${FILES[@]}" <<'PY'
import subprocess, re, sys
base_ref = sys.argv[1]
files = sys.argv[2:]

# Detecta llamadas .query( seguidas (en cualquier línea) de un template literal
# con interpolación. Se evalúa sobre una ventana centrada en cada línea agregada
# para capturar templates multilinea.
pattern = re.compile(r'\.query\s*\(\s*`[^`]*\$\{', re.DOTALL)
violations = []

for path in files:
    try:
        with open(path) as fh:
            lines = fh.read().splitlines()
    except FileNotFoundError:
        continue

    diff = subprocess.run(
        ['git', 'diff', '-U0', f'{base_ref}...HEAD', '--', path],
        capture_output=True, text=True, check=False,
    ).stdout
    added = set()
    cur = 0
    for dl in diff.splitlines():
        m = re.match(r'^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@', dl)
        if m:
            cur = int(m.group(1))
            continue
        if dl.startswith('+++'):
            continue
        if dl.startswith('+'):
            added.add(cur)
            cur += 1
        elif not dl.startswith('-'):
            cur += 1

    if not added:
        continue

    # Para detectar templates multilínea, revisa cada línea agregada como anchor:
    # busca un .query( hacia atrás (hasta 5 líneas) y un ${ después.
    seen = set()
    for lineno in sorted(added):
        if lineno <= 0 or lineno > len(lines):
            continue
        # Allow-list por comentario explícito en la línea o la anterior.
        line = lines[lineno - 1]
        prev = lines[lineno - 2] if lineno >= 2 else ''
        if '@allow-dynamic-sql' in line or '@allow-dynamic-sql' in prev:
            continue
        # Ventana hacia atrás 5 líneas y hacia adelante 20 líneas
        # para soportar templates multilínea.
        start = max(0, lineno - 6)
        end = min(len(lines), lineno + 20)
        window = '\n'.join(lines[start:end])
        # Solo nos interesa si la línea agregada aporta a un .query(...${...}).
        # Buscamos matches que crucen la línea agregada.
        for m in pattern.finditer(window):
            # Calcula a qué línea (en el archivo) corresponde el inicio del match.
            offset = m.start()
            match_line = start + 1 + window[:offset].count('\n')
            match_end_line = match_line + window[offset:m.end()].count('\n')
            # ¿La línea agregada está dentro del match?
            if match_line <= lineno <= match_end_line:
                key = (path, match_line)
                if key in seen:
                    continue
                seen.add(key)
                snippet = window[offset:offset + 120].replace('\n', ' ')
                violations.append((path, match_line, snippet))

if violations:
    print("❌ Interpolación insegura en .query() (líneas agregadas en el diff):")
    for path, lineno, snippet in violations:
        print(f"    {path}:{lineno}  {snippet}")
    print()
    print("   Usa parameterized queries: pool.query('... WHERE x = $1', [value])")
    print("   o marca la línea con // @allow-dynamic-sql si el SQL está controlado por código.")
    sys.exit(1)

print(f"✓ SQL safety: OK ({len(files)} archivo(s) revisados, solo líneas del diff)")
PY
