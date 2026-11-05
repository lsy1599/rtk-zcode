# RTK - Rust Token Killer

Token-optimized CLI proxy (60-90% savings on dev operations). The PreToolUse hook
rewrites Bash commands through `rtk` transparently — write commands normally.
Commands rtk does not optimize (e.g. `mkdir`, `echo`) run unchanged. `rtk gain`
shows measured savings; `rtk discover` finds missed optimization opportunities.

## Plan Mode (read-only exploration)

In plan mode, ZCode only allows whitelisted read-only commands; the rtk rewrite
makes them unclassifiable. Prefix **every** Bash segment with `RTK_OFF=1 ` — the
hook strips the prefix and skips the rewrite, so the native command runs:

```bash
RTK_OFF=1 git status --short
RTK_OFF=1 rg -n "pattern" src/
RTK_OFF=1 git status --short && RTK_OFF=1 git stash list   # compound: prefix EVERY segment
```

Use the prefix in plan mode only — in all other modes, write commands normally.
