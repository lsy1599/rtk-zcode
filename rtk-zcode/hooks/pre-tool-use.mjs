#!/usr/bin/env node
// rtk-zcode PreToolUse hook for ZCode — node port of the upstream bash shim.
// Replaces the cmd.exe -> bash -> jq -> rtk chain (1.0s/command) with a
// single node spawn + rtk (~0.28s). No jq or python3 dependency.
// Contract: rtk returns rewrite JSON -> print it; otherwise print nothing.
// Fail-open: any error exits 0 silently so the original command runs.

import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOG_FILE = process.env.RTK_ZCODE_LOG || join(homedir(), '.zcode', 'cli', 'logs', 'rtk-zcode.log');
const log = (msg) => {
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true });
    appendFileSync(LOG_FILE, `[${new Date().toISOString().slice(0, 19)}] ${msg}\n`);
  } catch {}
};
const done = () => process.exit(0);

let payload = '';
try {
  payload = readFileSync(0, 'utf8');
} catch {}
log(`stdin payload: ${payload || '<empty>'}`);

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const rtkCandidates = [process.env.RTK_BIN, 'rtk', join(pluginRoot, 'bin', 'rtk.exe')].filter(Boolean);
let rtk;
for (const c of rtkCandidates) {
  if (spawnSync(c, ['--version'], { stdio: 'ignore' }).status === 0) {
    rtk = c;
    break;
  }
}
if (!rtk) {
  log(`rtk not found (tried: ${rtkCandidates.join(', ')}); skipping`);
  done();
}

let cmd = '';
try {
  const d = JSON.parse(payload);
  cmd = d?.tool_input?.command ?? d?.toolInput?.command ?? d?.input?.command ?? '';
} catch {
  log('payload not valid JSON; skipping');
  done();
}
if (typeof cmd !== 'string' || !cmd.trim()) {
  log('no command extracted; skipping');
  done();
}
log(`extracted command: ${cmd}`);
if (/^rtk(\s|$)/.test(cmd.trim())) {
  log('command already prefixed with rtk; skipping');
  done();
}

const claudePayload = JSON.stringify({
  hook_event_name: 'PreToolUse',
  tool_name: 'Bash',
  tool_input: { command: cmd },
});
const r = spawnSync(rtk, ['hook', 'claude'], { input: claudePayload, encoding: 'utf8', timeout: 10_000 });
const out = (r.stdout || '').trim();
log(`rtk exit=${r.status} out=${out || '<empty>'}`);
if (!out) done();

try {
  console.log(JSON.stringify(JSON.parse(out)));
} catch {
  log(`rtk output not valid JSON; skipping: ${out}`);
}
done();
