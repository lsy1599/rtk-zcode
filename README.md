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
  2. 无需安装——hook 找不到 PATH 里的 rtk 时自动回退到插件内置的 `rtk-zcode/bin/rtk.exe`
  3. 设环境变量 `RTK_BIN` 指向任意 rtk 可执行文件

## 安装

**方式一（推荐）：插件市场**

1. 打开 ZCode → **设置 → 插件管理 → 发现** → 点「+」添加插件市场
2. 粘贴本仓库地址：`https://github.com/lsy1599/rtk-zcode`
3. 安装列表中的 **RTK Token 优化**（rtk-zcode）插件
4. 重启 ZCode

**方式二（手动）：**

clone 本仓库到 ZCode 插件目录 `~/.zcode/plugins/rtk-zcode`，然后在 `~/.zcode/cli/config.json` 的 `plugins` 块注册：

```jsonc
"plugins": {
    "dirs": ["C:\\Users\\<你>\\.zcode\\plugins\\rtk-zcode"],
    ...
}
```

重启 ZCode 生效。

## 验证

让 agent 随便跑一条 `git status` 或 `ls`，然后：

```bash
type %USERPROFILE%\.zcode\cli\logs\rtk-zcode.log   # 应有 rtk exit=0 out={...updatedInput...}
rtk gain                                            # 命令计数增长，总节省 60%+
```

输出出现 `[+N hidden: rtk recall ...]` = 压缩生效。日志默认写在 `~/.zcode/cli/logs/rtk-zcode.log`，设 `RTK_ZCODE_LOG` 环境变量可改路径。

## 回滚

市场安装：设置 → 插件管理 → 卸载 rtk-zcode。手动安装：从 `plugins.dirs` 删掉那一行。两种方式都不修改 ZCode 任何其他文件，`AGENTS.md` 保持干净（感知层走 SessionStart 注入）。

## 目录结构

```
rtk-zcode/                          # 仓库根 = 插件市场根
├── marketplace.json                # 市场清单
└── rtk-zcode/                      # 插件本体（目录名 = 插件名）
    ├── .zcode-plugin/plugin.json   # 插件清单
    ├── hooks/
    │   ├── hooks.json              # hook 注册（type: process + ${ZCODE_PLUGIN_ROOT}）
    │   ├── pre-tool-use.mjs        # 命令改写（node）
    │   └── session-start.mjs       # RTK.md 注入（node）
    ├── bin/rtk.exe                 # 内置 rtk（PATH 找不到时自动回退）
    ├── RTK.md                      # SessionStart 注入的感知内容
    └── LICENSE                     # MIT
```

## 许可与致谢

- 插件机制基于 macgaf 的上游实现（MIT，见 [LICENSE](rtk-zcode/LICENSE)）重构：hook 重写为 node 单进程、去除 jq/python3 依赖、模板变量改用 `${ZCODE_PLUGIN_ROOT}`、内置 rtk.exe 自动回退
- [rtk](https://github.com/rtk-ai/rtk)（MIT），`bin/rtk.exe` 来自其官方发行版
- 本仓库沿用 MIT
