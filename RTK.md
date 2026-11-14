# RTK - Rust Token Killer

Token-optimized CLI proxy (60-90% savings on dev operations). The PreToolUse hook
rewrites Bash commands through `rtk` transparently — write commands normally.
Commands rtk does not optimize (e.g. `mkdir`, `echo`) run unchanged. `rtk gain`
shows measured savings; `rtk discover` finds missed optimization opportunities.

## Plan Mode (read-only exploration)

Write plain commands normally, WITHOUT any `RTK_OFF=1` prefix — plain read-only
commands pass the plan gate. Hooks may still run in plan mode and rewrite
commands to `rtk ...`, which the plan gate then rejects (shown as empty output).
If a plainly read-only command is denied, retry ONCE with `RTK_OFF=1 ` prefixed
to every segment (the hook strips it and returns the bare command, which the
gate passes); if that is also denied, simplify to a single plain read-only
command or use Read/Explore instead — do not retry as-is. In normal modes,
`RTK_OFF=1 cmd` manually skips the rtk rewrite.
