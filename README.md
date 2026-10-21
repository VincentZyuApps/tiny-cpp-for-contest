# tiny-cpp-for-contest

> ⚡ 纯 TypeScript 实现的算法竞赛级 C++ 运行时、可交互评测系统与 📊 教学级状态机调试工具 ✨

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/Online%20Playground-GitHub%20Pages-success?logo=github)](https://vincentzyuapps.github.io/tiny-cpp-for-contest/)
[![Koishi Ecosystem](https://img.shields.io/badge/Koishi-Ecosystem-9580ff?style=flat&logo=data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAABU0lEQVR42p2UQSsFYRSGnxnqLuytKWKpKFkQNsS%2FsOHPWPADLCmxU5S7UzYWNrJR7lYiRF2FeWzOMKZ7mXHqNNP5vvP2nu%2B850CY2lP4X1K31ZbaDm%2BpO%2Bpyp5wfAXVEPfRvO1JHf4AVQGbUh7j4EZ4VkrNCXPVRnf3CUBN1SH2KC28VGOV3ntRhNclZHdcAKYM11QR1oVBOXctzFlNgBTC8qmXxPQEegbVeYApIgJT6tg%2F0AdMp0B%2FBpCabK2AAmAAa%2F2GRBft1oBFPkqTAba7LCiAfQC9wClwAY1HJHepuiO29Yrsf1Dn1uiDU3RTYCtTkl1Leg8k9MB4NGgReI28rV3azgyCz0og01Xl1Uz1QX8uCTELm3UbkTF1VJ9Wr0tn3iBSGdjYG0XivE3VN3VD31PM4a3cc2tIGGI0VkTO7rLxGuiy25ejmjfqsvkSXui62TxaK03td4FXTAAAAAElFTkSuQmCC&logoColor=white)](https://koishi.chat/)

> 🌐 **在线体验 (GitHub Pages)**: <https://vincentzyuapps.github.io/tiny-cpp-for-contest/>  
> 💻 **本地开发**: 运行 `npm run dev`（默认端口 `61022`）可直接在本地体验！

> [!WARNING]
> **项目快速迭代与完善中**
> - 本项目当前处于初版（`v0.1.2-beta`）快速开发与演进阶段，部分复杂或边缘的 C++ 语法及 STL 深度特性仍在逐步补全中，可能存在未预期的边界行为。
> - 非常欢迎在日常使用或算法题测试中发现 Bug 时提交 [GitHub Issues](https://github.com/VincentZyuApps/tiny-cpp-for-contest/issues)，更欢迎提交 Pull Request 共同完善这一有趣的纯 TS 状态机运行时！🎉

---

## 💡 项目哲学：程序就是一个状态机

> “编译和解释没有绝对的界限，他们的界限是模糊的。”  
> “程序不过是一个状态机：`S₀ ──(action)──> S₁ ──(action)──> ···`”  
> —— **致敬南京大学 蒋炎岩 (jyy) 老师**

本项目旨在以最纯粹的 TypeScript 从头实现一个专门面向 **算法竞赛常见语法（洛谷、Codeforces 常见签到/普及组题目）** 的轻量 C++ 运行时。它不仅能作为一个可在聊天平台（Koishi）快速评测代码的 Bot 插件，更是一个能在浏览器端单步漫游、回溯历史（Time-Travel Debugging）、观察变量并动态渲染状态转移图的可视化教学工具。

---

## 🏗️ 架构设计 (Monorepo)

本项目采用独立的 Monorepo 架构进行多端解耦：

```text
tiny-cpp-for-contest/
├── packages/
│   ├── core/                  # @tiny-cpp-for-contest/core
│   │                          # 纯 TS 词法分析、语法分析、语义检查、状态机虚拟机
│   ├── koishi-plugin/         # koishi-plugin-tiny-cpp-for-contest
│   │                          # Koishi 插件，提供 3 段式 session.prompt() 交互判题
│   └── web/                   # Vite + Vue 3 交互式 Web 调试器与 jyy 状态机图 (GitHub Pages)
│
├── scripts/
│   └── sync_plugin.py         # 插件同步脚本 (支持一键内联核心并桥接至目标 Koishi 环境)
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

## ⚠️ 语法支持与预处理器规范

> [!IMPORTANT]
> **竞赛预处理与标准库模拟说明**
> - **伪头文件抹平**：引擎在词法分析阶段前置拦截 `#include`，静默忽略 `<bits/stdc++.h>`、`<iostream>`、`<vector>` 等常见头文件引入，无需也不能依赖宿主系统 C++ 工具链。
> - **轻量宏展开机制**：仅通过内建文本替换器处理 `#define int long long`、`#define rep(...)` 等竞赛常用简易单行宏，不支持带深层条件编译（`#ifdef`）或递归宏展开的完整 C 预处理器。
> - **函数签名多词支持**：已兼容竞赛中因 `#define int long long` 导致的 `long long main()` 以及 `signed main()` 声明。

> [!TIP]
> **I/O 性能宏与输入流**
> - 代码中出现的 `cin.tie(0)`、`ios::sync_with_stdio(0)` 会被静默作为空操作通过，不影响执行逻辑。
> - 标准输入（stdin）采用流式 Tokenizer 机制，天然支持竞赛常见的跨行空白符自由分割读取（`cin >> a >> b`）。

---

## 🤖 Koishi 插件交互指引

插件注册了 `cjudge`（别名 `crun`, `cpp`）指令，采用 **渐进式三次问答引导（3-Step Prompt）**：

1. **Step 1/3 (代码)**：提示用户发送 C++ 源代码（支持直接发送或 Markdown 代码块）。
2. **Step 2/3 (输入)**：提示用户输入标准运行数据 stdin（以空格或换行分隔；无输入可输入 `-`）。
3. **Step 3/3 (判题/运行模式切换)**：
   - 若输入预期输出：进入 **Judge 模式**，自动做 Diff 比对，返回 `🟢 AC (Accepted)`、`🔴 WA (Wrong Answer)`、`🟡 TLE` 或 `🟣 CE`。
   - 若发送 `-` 或 `空`：进入 **Run 模式**，直接打印程序的输出、步数与耗时。
4. **安全保护**：随时发送 `取消`、`0`、`exit` 可退出当前会话；内置默认 30 秒超时保护与 100,000 步防死循环熔断。

---

## 🔄 插件同步与本地联调 (`sync_plugin.py`)

仓库提供专用的 Python 脚本，用于将 `packages/koishi-plugin` 及其核心引擎源码内联同步到宿主 Koishi 的 `external` 插件目录：

### 参数规范
- `--dst-path`：**【必须】** 目标 Koishi 宿主工程的根目录（脚本内部会自动拼接至 `<dst-path>/external/tiny-cpp-for-contest`）。
- `--clean`：（可选）在同步前清理目标目录。

### 运行命令
```bash
# 推荐使用 uv 运行 (示例本地路径如: G:\GGames\Minecraft\shuyeyun\qq-bot\koishi-dev\koishi-dev-8):
uv run python scripts/sync_plugin.py --dst-path "/path/to/koishi-app"

# 或直接使用 python 运行:
python scripts/sync_plugin.py --dst-path "/path/to/koishi-app"
```

同步完成后，在目标 Koishi 根目录运行以加载插件：
```bash
cd "/path/to/koishi-app"
yarn && yarn dev
```

---

## 📊 jyy 状态机图模型 (State Machine Mode)

在 WebUI 中提供致敬 jyy 老师的状态机可视化视图：
- **状态节点 (Node)**：由 $\langle \text{PC}, \text{Scope Variables} \rangle$ 构成唯一指纹，例如 `S2_L11_[a:20,b:22]`。
- **转移边 (Edge)**：标注引发状态变化的语句或操作（如 `cin >> a <- 20, b <- 22`）。
- **时间旅行 (Time-Travel)**：底层支持 `step()` 前进与 `stepPrev()` 回退，状态与输出同步倒流。
- **保护机制**：采用滑动窗口机制，限制同时展示的节点数量，防止大循环导致浏览器卡死。

---

## 路线图 (Roadmap)

- [x] **Milestone 1**: 核心骨架搭建、预处理宏清洗、词法与语法分析、状态机运行时、洛谷 P1001 (A+B) 验证通过、Koishi 插件三段交互、Python 同步脚本。
- [x] **Milestone 2**: 基础流程控制（`if/else`, `while`, `for`, `break/continue`）与一维数组，通过洛谷 P1428 (小鱼比可爱)。
- [x] **Milestone 3**: 宿主 STL 模拟（`vector`, `string`, `pair`, `std::sort`）与引用传参（`int &x`）。
- [x] **Milestone 4**: WebUI 可视化单步调试器 (Vite + Vue 3) 与 jyy 状态机图交互联动。
- [x] **Milestone 5**: 进阶容器（`queue`, `stack`, `priority_queue`）与 GitHub Actions 自动部署 Pages。
