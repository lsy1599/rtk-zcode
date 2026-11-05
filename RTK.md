# RTK - Rust Token Killer

**Usage**: Token-optimized CLI proxy (60-90% savings on dev operations)

## Meta Commands (always use rtk directly)

```bash
rtk gain              # Show token savings analytics
rtk gain --history    # Show command usage history with savings
rtk discover          # Analyze history for missed optimization opportunities
rtk proxy <cmd>       # Execute raw command without filtering (for debugging)
```

## Installation Verification

```bash
rtk --version         # Should show: rtk X.Y.Z
rtk gain              # Should work (not "command not found")
which rtk             # Verify correct binary
```

⚠️ **Name collision**: If `rtk gain` fails, you may have reachingforthejack/rtk (Rust Type Kit) installed instead.

## Hook-Based Usage

All Bash commands are automatically rewritten by the rtk-zcode plugin hook
(PreToolUse). You write commands normally; supported commands are transparently
routed through rtk at execution time.

Example: `git status` → `rtk git status` (transparent, 0 tokens overhead)

Commands rtk does not optimize (e.g. `mkdir`, `echo`) run unchanged. You do not
need to prefix commands with `rtk` yourself — the hook handles it.

## Plan Mode (read-only exploration)

In plan mode, ZCode only allows whitelisted read-only commands. The rtk rewrite
turns `git status` into the unknown command `rtk git status`, which the plan
gate blocks — so in plan mode, prefix **every** Bash command with `RTK_OFF=1 `:

```bash
RTK_OFF=1 git status      # hook strips the prefix; original command runs untouched
RTK_OFF=1 rg -n "pattern" src/
```

The hook removes the prefix and skips the rtk rewrite, so ZCode sees the native
command and the plan gate passes it. Use the prefix in plan mode only — in all
other modes, write commands normally.
