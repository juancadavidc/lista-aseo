// verify-ui.mjs — visual gate for the frontend-loop harness.
//
// Boots the Vite preview server, opens a route at a mobile-first viewport (360px),
// captures a full-page screenshot + any console/page errors, and prints JSON.
// The read-only verifier sub-agent then READS the screenshot and judges it.
//
// Setup (run once, from frontend/):
//   npm i -D playwright && npx playwright install chromium
//
// Usage (from frontend/):
//   npm run build && node scripts/verify-ui.mjs /            # verify home route
//   node scripts/verify-ui.mjs /tasks                        # verify another route
//
// Exit code is 0 even on console errors — the gate decision is the verifier's job,
// not this script's. It only gathers evidence. Non-zero only on a crash (couldn't
// boot / couldn't load the page at all).

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const route = process.argv[2] || '/';
const PORT = 4178; // dedicated port so it won't collide with `npm run dev`
const VIEWPORT = { width: 360, height: 800 }; // mobile-first per CLAUDE.md

const frontendDir = path.resolve(fileURLToPath(import.meta.url), '../..');
const runsDir = path.resolve(frontendDir, '../docs/frontend-loop/runs');
const safeName = route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root';
const shotPath = path.join(runsDir, `${safeName}-360.png`);

function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok || res.status === 404) return resolve();
      } catch { /* not up yet */ }
      if (Date.now() - start > timeoutMs) return reject(new Error('preview server did not start'));
      setTimeout(tick, 300);
    };
    tick();
  });
}

let server;
try {
  await mkdir(runsDir, { recursive: true });

  // Serve the production build (assumes `npm run build` already ran).
  server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: frontendDir,
    stdio: 'ignore',
  });

  const base = `http://localhost:${PORT}`;
  await waitForServer(base);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });

  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

  const resp = await page.goto(base + route, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(500); // let any entrance animation settle

  // Detect horizontal overflow at 360px (mobile-first violation).
  const overflowPx = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );

  await page.screenshot({ path: shotPath, fullPage: true });
  await browser.close();

  console.log(JSON.stringify({
    route,
    httpStatus: resp ? resp.status() : null,
    viewport: VIEWPORT,
    screenshot: shotPath,
    consoleErrors,
    horizontalOverflowPx: overflowPx,
    hint: 'Verifier: READ the screenshot PNG. overflowPx>0 means horizontal scroll at 360px (FAIL criterion 4).',
  }, null, 2));
} catch (err) {
  console.error(JSON.stringify({ error: String(err && err.message || err) }, null, 2));
  process.exitCode = 1;
} finally {
  if (server) server.kill();
}
