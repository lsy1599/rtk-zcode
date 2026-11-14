# RTK - Rust Token Killer

Token-optimized CLI proxy (60-90% savings on dev operations). The PreToolUse hook
rewrites Bash commands through `rtk` transparently — write commands normally.
Commands rtk does not optimize (e.g. `mkdir`, `echo`) run unchanged. `rtk gain`
shows measured savings; `rtk discover` finds missed optimization opportunities.

## Plan Mode

The hook does NOT run in plan mode: commands reach the plan gate untouched —
no rtk rewrite happens, and `RTK_OFF=1` is never needed there. The gate
(source-verified in ZCode 3.18.x) evaluates each command segment against a
read-only whitelist: `ls/cat/head/tail/wc/sort/uniq/rg/grep/find/echo` and
in-cwd plain `git log/show/status` pass. Three hard rules explain the
recurring "git has no output" failure:

- `cd X && git ...` is ALWAYS denied: any command combining git with
  cd/pushd/popd is treated as unsafe (git may load hooks/config from the
  target dir). Plain `cd X && ls/grep` is fine.
- `git -C <path>` is ALWAYS denied (even `-C .`): `-C` is on git's
  dangerous-global-flag list. Cross-repo git history is unreachable in plan
  mode — say so and move on.
- env prefixes are denied (`RTK_OFF=1` is not on the safe-env whitelist) —
  never use them in plan mode.

Unparseable/unknown shapes also fall back to deny, so a denied read-only
command may just be shape mismatch: do NOT retry as-is; switch to
Read/`cat`/`head`/`rg`, or plain git when cwd is already the target repo.
Denials may render in the UI as empty output ("没有输出") — the model side
does receive the real denial text.

In normal modes, `RTK_OFF=1 cmd` skips the rtk rewrite for that command.
