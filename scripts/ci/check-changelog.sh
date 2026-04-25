#!/usr/bin/env bash
# Falla si hay cambios en código (frontend/ o server/) sin update a docs/CHANGELOG.md.
# Regla crítica #8 del CLAUDE.md: toda feature/fix se registra en CHANGELOG.
set -euo pipefail

BASE_REF="${BASE_REF:-origin/main}"

CHANGED=$(git diff --name-only "$BASE_REF"...HEAD 2>/dev/null || true)

CODE_CHANGED=$(echo "$CHANGED" | grep -E '^(frontend|server)/' | grep -vE '__tests__|\.test\.(js|jsx)$|\.spec\.(js|jsx)$' || true)

if [ -z "$CODE_CHANGED" ]; then
  echo "✓ CHANGELOG: sin cambios de código productivo, skip"
  exit 0
fi

if echo "$CHANGED" | grep -qx 'docs/CHANGELOG.md'; then
  echo "✓ CHANGELOG: actualizado"
  exit 0
fi

echo "❌ Hay cambios en frontend/ o server/ pero docs/CHANGELOG.md no se modificó."
echo ""
echo "Archivos de código modificados:"
echo "$CODE_CHANGED" | sed 's/^/    /'
echo ""
echo "Agrega una entrada en docs/CHANGELOG.md describiendo el cambio y su fase."
exit 1
