# RTK - Rust Token Killer

Token-optimized CLI proxy (60-90% savings on dev operations). The PreToolUse hook
rewrites Bash commands through `rtk` transparently — write commands normally.
Commands rtk does not optimize (e.g. `mkdir`, `echo`) run unchanged. `rtk gain`
shows measured savings; `rtk discover` finds missed optimization opportunities.

## Plan Mode (read-only exploration)

In plan mode, hooks don't run — commands reach ZCode's gate as written. Write
commands normally, WITHOUT any `RTK_OFF=1` prefix (the prefix makes plain
commands look like env-assignments and gets them blocked). If a command is
denied, don't retry it as-is: simplify to a single plain read-only command, or
use the Read/Glob/Grep tools instead. If you ever see commands rewritten to
`rtk ...` and denied in plan mode (some setups may run hooks there), prefix
every segment with `RTK_OFF=1 ` as the escape hatch. In normal modes,
`RTK_OFF=1 cmd` manually skips the rtk rewrite.
