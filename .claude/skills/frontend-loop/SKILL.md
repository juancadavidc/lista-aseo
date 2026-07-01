---
name: frontend-loop
description: >
  Closed plan→build↔verify loop for Casa Limpia frontend (React/Vite/Tailwind).
  Use when Juan asks to build, change, or fix a UI/screen/component and wants it
  verified automatically (build + vitest + Playwright screenshot reviewed by a
  separate read-only verifier). Stops on PASS or 5 rounds.
---

# Frontend Loop — plan → build ↔ verify (closed loop)

This skill IS the harness. It runs a closed loop with a **separate verifier**.
The agent that builds must NEVER grade its own work (hard rule from the loop-
engineering playbook). The verifier is a read-only sub-agent.

## Contract

- **Goal:** ship the requested UI change so it passes ALL success criteria below.
- **Boundaries (never touch):** `server/`, DB migrations, auth flow, any query's
  `organization_id` filter. Frontend only. No new design-system colors — use
  `surface / clay / moss / bark` only.
- **Stop condition:** verifier returns PASS, OR 5 build↔verify rounds reached.
- **On stop:** append a run entry to `docs/frontend-loop/log.md` and report what
  changed + what still fails (if it stopped on the round cap).

## Success criteria (the gate — measurable, no soft passes)

A round only PASSES when the verifier confirms ALL of these:

1. `npm run build` (in `frontend/`) exits 0 — no compile/bundle errors.
2. `npm test` (in `frontend/`) exits 0 — vitest green, nothing existing broken.
3. Playwright run is clean: **zero console errors**, the target route renders
   (no blank/error screen).
4. Visual review of the 360px screenshot (verifier looks at the PNG):
   - mobile-first: no horizontal scroll at 360px wide.
   - tap targets (buttons/links) look ≥ 44px.
   - only design-system colors; layout matches the request; no obvious overflow,
     overlap, or unstyled flash.
5. The change does ONLY what was asked (no over-engineering, no scope creep).

> If a criterion can't be proven from build output / test output / the screenshot,
> the verifier must FAIL the round and say exactly what's missing. No benefit of
> the doubt.

## Loop protocol — repeat each round

### 1. PLAN  (first round only, or when the approach changes)
- Read `CLAUDE.md`, the relevant files under `frontend/src/`, and the last 5
  entries of `docs/frontend-loop/log.md`.
- Write a 3–6 line plan: which files change, which route to verify, and restate
  the success criteria specific to THIS task (e.g. "the new filter chip row must
  wrap at 360px").

### 2. BUILD  (generator)
- Make the smallest change that moves toward the criteria. On later rounds, fix
  ONLY the weakest item the verifier flagged last round — do not rewrite working
  parts.

### 3. VERIFY  (separate read-only sub-agent — spawn it, do not self-check)
Spawn a sub-agent with the Explore/general-purpose type and this brief:

> Read-only verifier. Do NOT edit files. Run the gate for route `<ROUTE>`:
> 1. `cd frontend && npm run build` — report pass/fail + first error.
> 2. `cd frontend && npm test` — report pass/fail + failing tests.
> 3. `cd frontend && node scripts/verify-ui.mjs <ROUTE>` — it boots the preview
>    server, screenshots at 360px to `docs/frontend-loop/runs/`, and prints JSON
>    with the screenshot path + any console errors.
> 4. READ the screenshot PNG and judge criteria 3–4 above.
> Return strict JSON: `{ "verdict": "PASS"|"FAIL", "scores": {build, test,
> console, visual, scope}, "weakest": "<one thing to fix next>", "evidence":
> "<what you saw>" }`. Default to FAIL if unsure.

### 4. DECIDE
- Verifier says PASS → print `FINAL`, append to the log, stop.
- Verifier says FAIL → print `ITERATING — fixing: <weakest>` and go to BUILD,
  addressing only `weakest`.
- Round 5 reached without PASS → stop, log it, report honestly what still fails.

## State (so the loop learns across runs)

- **Log:** `docs/frontend-loop/log.md` — one entry per finished run (task, route,
  rounds used, final verdict, what changed). Read last 5 before planning.
- **Artifacts:** `docs/frontend-loop/runs/` — screenshots + verdict JSON per round.

## Notes

- This is a CLOSED loop on purpose (budget-safe, converges). To add novelty on a
  visual task, keep criteria 1–5 as the hard floor and add ONE open instruction
  to the BUILD step (e.g. "surprise me with the empty-state illustration").
- Requires Playwright (see `frontend/scripts/verify-ui.mjs` header for setup).
