#!/usr/bin/env bash
# Falla si detecta interpolación de variables dentro de llamadas .query(`...${var}...`).
# Regla crítica #2 del CLAUDE.md: SQL SIEMPRE con parameterized queries ($1, $2...).
set -euo pipefail

BASE_REF="${BASE_REF:-origin/main}"

mapfile -t FILES < <(git diff --name-only --diff-filter=ACMR "$BASE_REF"...HEAD -- 'server/**/*.js' 'server/*.js' 2>/dev/null || true)

if [ "${#FILES[@]}" -eq 0 ]; then
  echo "✓ SQL safety: sin cambios en server/, skip"
  exit 0
fi

VIOLATIONS=0
for f in "${FILES[@]}"; do
  [ -f "$f" ] || continue
  # Busca .query( ... `...${...}...` ... ) en múltiples líneas.
  # Python es más confiable que regex bash multilinea.
  python3 - "$f" <<'PY' || VIOLATIONS=$((VIOLATIONS + 1))
import re, sys
path = sys.argv[1]
src = open(path).read()
# Encuentra llamadas .query( seguidas (en cualquier línea) de un template literal con ${...}
pattern = re.compile(r'\.query\s*\(\s*`[^`]*\$\{', re.DOTALL)
hits = []
for m in pattern.finditer(src):
    line = src[:m.start()].count('\n') + 1
    snippet = src[m.start():m.start()+120].replace('\n', ' ')
    hits.append((line, snippet))
if hits:
    print(f"✗ {path}: interpolación en query()")
    for line, snippet in hits:
        print(f"    línea {line}: {snippet}")
    sys.exit(1)
sys.exit(0)
PY
done

if [ "$VIOLATIONS" -gt 0 ]; then
  echo ""
  echo "❌ $VIOLATIONS archivo(s) con SQL inseguro."
  echo "   Usa parameterized queries: pool.query('... WHERE x = \$1', [value])"
  exit 1
fi

echo "✓ SQL safety: OK (${#FILES[@]} archivo(s) revisados)"
