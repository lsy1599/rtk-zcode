# rtk-zcode

把 [rtk](https://github.com/rtk-ai/rtk)（Rust Token Killer）接入 [ZCode](https://zcode.z.ai/cn) 的插件：所有 Bash 命令被 hook **透明改写**走 rtk 压缩输出，实测省 60%+ token。命令栏显示的仍是原始命令，改写发生在执行层。

```
agent 写:   git status
实际执行:   rtk git status    ← 输出压缩 60-90%，输出尾部出现 [+N hidden: rtk recall ...] 标记
```

## 原理

| Hook | 事件 | 作用 |
|------|------|------|
| `hooks/pre-tool-use.mjs` | PreToolUse (Bash) | 把命令转发给 `rtk hook claude`；有优化对应就返回 `updatedInput` 改写命令，没有就静默放行 |
| `hooks/session-start.mjs` | SessionStart | 注入 `RTK.md` 感知层（约 1KB），agent 知道 `rtk gain` 等元命令 |

任何错误都会 fail-open（静默退出 0），原始命令永远照常执行。

## 性能

hook 用 node 单进程直连 rtk（`type: "process"`，无 shell、无 jq 依赖），每条命令约 **0.28s**。

## 前置条件

- **ZCode ≥ 3.1.8**（需支持 PreToolUse `updatedInput`，3.17.x 已验证）
- **node** 在 PATH 上（hook 是 node 脚本）
- **rtk**：三选一
  1. `winget install rtk-ai.rtk`（推荐，可自动更新）
  2. 无需安装——hook 找不到 PATH 里的 rtk 时自动回退到插件内置的 `bin/rtk.exe`
  3. 设环境变量 `RTK_BIN` 指向任意 rtk 可执行文件

## 安装

**方式一（推荐）：添加插件目录**

1. clone 本仓库（**保持目录名 `rtk-zcode`**，需与插件清单 name 一致；zip 下载会得到 `rtk-zcode-main`，请改名）
2. ZCode → **设置 → 插件管理** → 添加插件目录，选择**仓库根目录**（根目录含 `.zcode-plugin/plugin.json`）
3. 重启 ZCode

也可以手动 clone 后在 `~/.zcode/cli/config.json` 的 `plugins` 块注册同一目录：

```jsonc
"plugins": {
    "dirs": ["C:\\Users\\<你>\\.zcode\\plugins\\rtk-zcode"],
    ...
}
```

**方式二：插件市场**

1. ZCode → **设置 → 插件管理 → 发现** → 点「+」添加插件市场，粘贴本仓库地址：`https://github.com/lsy1599/rtk-zcode`
2. 安装列表中的 **RTK Token 优化**（rtk-zcode）插件
3. 若市场添加失败（个别 ZCode 版本不支持 `source: "."` 自引用），改用方式一

## 验证

让 agent 随便跑一条 `git status` 或 `ls`，然后：

```bash
type %USERPROFILE%\.zcode\cli\logs\rtk-zcode.log   # 应有 rtk exit=0 out={...updatedInput...}
rtk gain                                            # 命令计数增长，总节省 60%+
```

输出出现 `[+N hidden: rtk recall ...]` = 压缩生效。日志默认写在 `~/.zcode/cli/logs/rtk-zcode.log`，设 `RTK_ZCODE_LOG` 环境变量可改路径。

## Plan 模式

2026-11-15 终局实测（修正 11-14 结论）：plan 模式下 PreToolUse hook **从不运行**——命令原样到达门禁，无 rtk 改写，也无需 `RTK_OFF=1`。此前 11-14"hook 会运行且改写被拒"系误把 yolo 会话当 plan 窗口（其日志 payload 全部 `"mode":"yolo"`）。

plan 门禁是逐段白名单（判定看形状、个别有波动）：cwd 内纯 `git log` / `git show` / `git status` / `ls` / `rg` / `head` / `cat` / `echo` / `find` 放行；`cd`、`git -C <path>`（连 `-C .` 都拒）、`tail`、`wc`、`sort`、`uniq` 被拒。**跨仓库（cwd≠目标仓库）在 plan 下读 git 历史无解**——这是 ZCode 门禁白名单的平台限制，与 rtk 无关。模型侧收到明确拒绝文案，但 UI 把拒绝渲染成"没有输出"，易误读为空结果。被拦时不要原样重试、不要加 `RTK_OFF=1`（实测无效），改用 Read/`cat`/`head`/`rg`，或 cwd 已在目标仓库时用纯 git 命令。普通模式下 `RTK_OFF=1 cmd` 仍是手动跳过改写的开关。

## 已知限制

- **管道语义变化**：rtk 的压缩发生在命令执行层，`rg ... | tail -5` 这类管道里 head/tail 拿到的已是 rtk 压缩后的输出（尾部出现 `[+N hidden: rtk recall ...]` 标记），与原始命令语义不同。需要精确定位（原始输出的末尾 N 行、行号）时，改用 Read/Grep 工具而非 bash 管道。
- **plan 模式**：hook 从不运行、无改写；门禁白名单拒 `cd`/`git -C`/`tail` 等（UI 显示为无输出），跨仓库 git 历史读不到属平台限制，见上文「Plan 模式」一节。

## 回滚

市场安装：设置 → 插件管理 → 卸载 rtk-zcode。手动安装：从 `plugins.dirs` 删掉那一行。两种方式都不修改 ZCode 任何其他文件，`AGENTS.md` 保持干净（感知层走 SessionStart 注入）。

## 目录结构

```
rtk-zcode/                          # 仓库根 = 插件本体（= 市场根）
├── .zcode-plugin/plugin.json       # 插件清单
├── marketplace.json                # 市场清单（source: "."，可选）
├── hooks/
│   ├── hooks.json                  # hook 注册（type: process + ${ZCODE_PLUGIN_ROOT} + timeoutMs）
│   ├── pre-tool-use.mjs            # 命令改写（node）
│   └── session-start.mjs           # RTK.md 注入（node）
├── bin/rtk.exe                     # 内置 rtk（PATH 找不到时自动回退）
├── RTK.md                          # SessionStart 注入的感知内容
└── LICENSE                         # MIT
```

## 许可与致谢

- 插件机制基于 macgaf 的上游实现（MIT，见 [LICENSE](LICENSE)）重构：hook 重写为 node 单进程、去除 jq/python3 依赖、模板变量沿用 `${ZCODE_PLUGIN_ROOT}`、内置 rtk.exe 自动回退
- [rtk](https://github.com/rtk-ai/rtk)（MIT），`bin/rtk.exe` 来自其官方发行版
- 本仓库沿用 MIT
