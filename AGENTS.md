# tiny-cpp-for-contest 开发与发布工程规范 (AGENTS.md)

本项目是一个纯 TypeScript 实现的算法竞赛 C++ 运行时、状态机调试系统与 Koishi 交互插件的 Monorepo 工程。

---

## 一、 架构与子包职责划分

1. **`packages/core` (`tiny-cpp-for-contest-core`)**
   - **性质**：独立的算法解释器与状态机核心运行时库，发布至 npm。
   - **依赖关系**：纯 TS 实现，零外部聊天平台依赖，供 Web 前端与 Koishi 插件共同引用。
   - **测试规范**：所有核心改动在 `test/` 下编写独立脚本进行单元测试与基准验证。

2. **`packages/web` (`tiny-cpp-for-contest-web`)**
   - **性质**：基于 Vue 3 + Vite 的在线交互式状态机调试器（Playground）。
   - **发布策略**：`"private": true`，**绝不发布至 npm**，仅通过 GitHub Pages 静态托管（CI 自动部署）。

3. **`packages/koishi-plugin` (`koishi-plugin-tiny-cpp-for-contest`)**
   - **性质**：面向 Koishi 机器人生态的算法交互与在线判题插件，发布至 npm。
   - **依赖原则**：**禁止在插件内部内嵌或复制代码副本**；插件必须通过 `dependencies` 依赖 npm 上的 `tiny-cpp-for-contest-core`。
   - **源码纯净度**：`src/` 仅维护 `index.ts`（命令注册、会话状态流转与 Markdown 响应），保持极度清爽。

---

## 二、 版本号与 NPM 发布规范 (核心准则)

### 1. 版本号格式 (Git 与本地)
- Git 代码库与 `package.json` 中统一使用带有构建日期元数据的版本号：
  `0.1.6-beta.8+20261022`
- 用于精确定位构建时间与发布批次。

### 2. NPM 发布时的日期剥离与即时还原
- **背景**：npm 官方严格遵循 SemVer 2.0，若版本号中带有 `+` 及其后面的构建元数据，`npm publish` 会报错并拒绝发布。
- **发布准则**：
  - 必须通过 `scripts/publish_npm.py` 执行发布。
  - 发布脚本在发布前自动将 `+YYYYMMDD` 剥离为标准 SemVer（如 `0.1.6-beta.8`）。
  - 通过 Python 的 `try...finally` 结构，**无论发布成功还是失败，均毫秒级无损还原原始带有日期的 `package.json`**，保证本地与 Git 提交的完整性。

### 3. NPM Dist-Tags 策略
- 每次发布时同时维护两个标签：
  1. **`latest`**：确保 Koishi 官方市场与包管理器默认推荐和安装。
  2. **`next`**：预发布版本通道标签，供测试尝鲜使用。

---

## 三、 本地测试与发布联动工作流

1. **改动与测试**：在 `packages/core` 修改代码，运行 `node test/test_xxx.js` 验证通过。
2. **发布 Core**：执行 `python scripts/publish_npm.py --pkg core` 发布最新版本到 npm。
3. **插件对接**：`packages/koishi-plugin` 升级依赖版本并编译。
4. **发布 Plugin**：执行 `python scripts/publish_npm.py --pkg koishi-plugin` 发布至 Koishi 插件生态。
5. **本地宿主验证**：同步至 `koishi-dev` 运行目录，执行 `yarn` 更新并启动。
