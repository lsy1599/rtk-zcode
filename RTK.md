# RTK - Rust Token Killer

Token-optimized CLI proxy (60-90% savings on dev operations). The PreToolUse hook
rewrites Bash commands through `rtk` transparently — write commands normally.
Commands rtk does not optimize (e.g. `mkdir`, `echo`) run unchanged. `rtk gain`
shows measured savings; `rtk discover` finds missed optimization opportunities.

## Plan Mode

The hook does NOT run in plan mode: commands reach the plan gate untouched —
no rtk rewrite happens, and `RTK_OFF=1` is never needed there. The gate is a
per-segment read-only whitelist. Measured: in-cwd `git log/show/status`, `ls`,
`rg`, `head`, `cat`, `find`, `echo` pass; `cd`, `git -C <path>`, `tail`, `wc`,
`sort`, `uniq` are denied — and denials may render as empty output ("没有输出"),
not an error. If a read-only command is denied in plan mode, do NOT retry it
as-is or with `RTK_OFF=1` (measured: does not help). Instead switch to
Read/`cat`/`head`/`rg`, or plain git commands when cwd is already the target
repo. Cross-repo git history (needing `cd`/`git -C`) is unreachable in plan
mode — say so and move on.

In normal modes, `RTK_OFF=1 cmd` skips the rtk rewrite for that command.
