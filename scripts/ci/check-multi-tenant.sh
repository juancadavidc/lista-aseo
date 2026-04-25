#!/usr/bin/env bash
# Falla si detecta queries nuevas sobre tablas multi-tenant que no filtran por organization_id.
# Regla crítica #1 del CLAUDE.md: toda query filtra por organization_id.
# Heurística diff-based: revisa líneas AGREGADAS que tocan tablas multi-tenant
# y busca organization_id en la vecindad (±15 líneas).
#
# Para escapar intencionalmente (ej. queries de super-admin globales), agrega el
# comentario `// @allow-cross-tenant` en la línea anterior o la misma línea.
set -euo pipefail

BASE_REF="${BASE_REF:-origin/main}"
TABLES="tasks|products|shopping_items|shopping_categories|house_member_profiles|push_subscriptions"

mapfile -t FILES < <(git diff --name-only --diff-filter=ACMR "$BASE_REF"...HEAD -- 'server/**/*.js' 'server/*.js' 2>/dev/null || true)

if [ "${#FILES[@]}" -eq 0 ]; then
  echo "✓ Multi-tenant: sin cambios en server/, skip"
  exit 0
fi

python3 - "$BASE_REF" "$TABLES" "${FILES[@]}" <<'PY'
import subprocess, re, sys
base_ref = sys.argv[1]
tables = sys.argv[2]
files = sys.argv[3:]

table_re = re.compile(
    rf'\b(FROM|JOIN|UPDATE|INTO|DELETE\s+FROM)\s+({tables})\b',
    re.IGNORECASE,
)
violations = []

for path in files:
    try:
        with open(path) as fh:
            lines = fh.read().splitlines()
    except FileNotFoundError:
        continue

    # Líneas agregadas en el diff (1-indexed en el HEAD).
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

    for lineno in sorted(added):
        if lineno <= 0 or lineno > len(lines):
            continue
        line = lines[lineno - 1]
        if not table_re.search(line):
            continue
        # Allow-list por comentario explícito.
        prev = lines[lineno - 2] if lineno >= 2 else ''
        if '@allow-cross-tenant' in line or '@allow-cross-tenant' in prev:
            continue
        # Busca organization_id en una ventana ±15 líneas (la query puede abarcar varias).
        start = max(0, lineno - 16)
        end = min(len(lines), lineno + 15)
        window = '\n'.join(lines[start:end])
        if 'organization_id' not in window and 'organizationId' not in window:
            violations.append((path, lineno, line.strip()[:120]))

if violations:
    print("❌ Queries multi-tenant sin filtro por organization_id:")
    for path, lineno, snippet in violations:
        print(f"    {path}:{lineno}  {snippet}")
    print()
    print("   Agrega `WHERE organization_id = $N` o marca la línea con")
    print("   // @allow-cross-tenant si es intencional (ej. super-admin).")
    sys.exit(1)

print(f"✓ Multi-tenant: OK ({len(files)} archivo(s) revisados)")
PY
