#!/usr/bin/env node
// rtk-zcode SessionStart hook for ZCode — node port of the upstream bash shim.
// Injects RTK.md as additionalContext so AGENTS.md stays free of rtk content.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOG_FILE = process.env.RTK_ZCODE_LOG || join(homedir(), '.zcode', 'cli', 'logs', 'rtk-zcode.log');
const log = (msg) => {
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true });
    appendFileSync(LOG_FILE, `[${new Date().toISOString().slice(0, 19)}] [session-start] ${msg}\n`);
  } catch {}
};

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const candidates = [process.env.RTK_MD, join(pluginRoot, 'RTK.md'), join(homedir(), '.zcode', 'RTK.md')].filter(Boolean);
const rtkMd = candidates.find((p) => existsSync(p));
if (!rtkMd) {
  log(`RTK.md not found (checked: ${candidates.join(', ')}); skipping injection`);
  process.exit(0);
}

let content = '';
try {
  content = readFileSync(rtkMd, 'utf8');
} catch {
  process.exit(0);
}
if (!content.trim()) {
  log(`RTK.md empty or unreadable (${rtkMd}); skipping injection`);
  process.exit(0);
}
log(`injecting RTK.md (${rtkMd}, ${Buffer.byteLength(content)} bytes)`);
console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: content } }));
