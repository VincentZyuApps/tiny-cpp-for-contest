/**
 * packages/koishi-plugin/src/index.ts
 * Koishi 插件主入口：提供三段式 session.prompt() 的 C++ 算法题交互评测与运行
 */

import { Context, Schema, Session } from 'koishi';
import { runCode, judgeCode, PRESET_EXAMPLES } from 'tiny-cpp-for-contest-core';

export interface Config {
  promptTimeout: number; // 提示超时时长 (秒)
  maxSteps: number;      // 最大执行步数熔断上限
}

export const Config: Schema<Config> = Schema.object({
  promptTimeout: Schema.number()
    .default(30)
    .description('session.prompt 多轮等待输入的超时时长 (秒)'),
  maxSteps: Schema.number()
    .default(100_000)
    .description('防死循环的最大执行步数上限 (超过则判定为 TLE)'),
});

export const name = 'tiny-cpp-for-contest';

// 清洗 Markdown 代码块
function cleanCodeBlock(text: string): string {
  let cleaned = text.trim();
  // 匹配 ```cpp ... ``` 或 ```c++ ... ``` 或 ``` ... ```
  const codeBlockRegex = /^```(?:cpp|c\+\+|c)?\s*([\s\S]*?)\s*```$/i;
  const match = cleaned.match(codeBlockRegex);
  if (match) {
    return match[1].trim();
  }
  return cleaned;
}

// 检查是否为退出词
function isExitCommand(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return ['取消', '退出', '0', 'exit', 'quit', 'cancel'].includes(normalized);
}

export function apply(ctx: Context, config: Config) {
  ctx.command('cjudge', '📝 交互式 C++ 算法题评测与运行 (支持分步输入代码、stdin 与期望输出)')
    .alias('crun')
    .alias('cpp')
    .action(async ({ session }) => {
      if (!session) return;

      const timeoutMs = (config.promptTimeout || 30) * 1000;

      // -------------------------------------------------------------
      // Step 1: 提示用户输入 C++ 源码
      // -------------------------------------------------------------
      await session.send(
        `📝【Step 1/3】请在 ${config.promptTimeout} 秒内发送 C++ 源代码：\n` +
        `（支持直接发送或 Markdown 代码块，发送 "取消" 可退出会话）`
      );

      const codeRaw = await session.prompt(timeoutMs);
      if (codeRaw === undefined) {
        return session.send('⌛ 等待代码输入超时，已自动取消会话。');
      }
      if (isExitCommand(codeRaw)) {
        return session.send('🚪 已退出评测会话。');
      }

      const code = cleanCodeBlock(codeRaw);
      if (!code) {
        return session.send('⚠️ 输入的代码为空，会话终止。');
      }

      // -------------------------------------------------------------
      // Step 2: 提示用户输入标准输入 (stdin)
      // -------------------------------------------------------------
      await session.send(
        `📥【Step 2/3】请输入运行数据 (stdin)：\n` +
        `（以空格或换行分隔，若无输入可发送 "-" 或 "空"）`
      );

      const stdinRaw = await session.prompt(timeoutMs);
      if (stdinRaw === undefined) {
        return session.send('⌛ 等待 stdin 输入超时，已自动取消会话。');
      }
      if (isExitCommand(stdinRaw)) {
        return session.send('🚪 已退出评测会话。');
      }

      let stdin = stdinRaw.trim();
      if (stdin === '-' || stdin === '空' || stdin === 'none') {
        stdin = '';
      }

      // -------------------------------------------------------------
      // Step 3: 提示用户输入期望输出 (expected stdout) 用于判题
      // -------------------------------------------------------------
      await session.send(
        `🎯【Step 3/3】请输入预期输出 (expected stdout)：\n` +
        `（输入后将自动判题比对 AC/WA；若仅运行不比对可直接发送 "-"）`
      );

      const expectedRaw = await session.prompt(timeoutMs);
      if (expectedRaw === undefined) {
        return session.send('⌛ 等待预期输出输入超时，已自动取消会话。');
      }
      if (isExitCommand(expectedRaw)) {
        return session.send('🚪 已退出评测会话。');
      }

      const expected = expectedRaw.trim();
      const isJudgeMode = expected !== '-' && expected !== '空' && expected !== 'none';

      // -------------------------------------------------------------
      // 执行引擎状态机
      // -------------------------------------------------------------
      await session.send('⚙️ 正在通过纯 TS 状态机引擎执行中...');

      if (isJudgeMode) {
        // 评测模式 (Judge Mode)
        const result = judgeCode(code, stdin, expected, config.maxSteps);

        if (result.status === 'AC') {
          return session.send(
            `🟢【Accepted - AC 🎉】全部通过！\n` +
            `⏱ 耗时: ${result.elapsedMs} ms | ⚡ 步数: ${result.steps} 步\n` +
            `📤 实际输出:\n${result.stdout.trim() || '[空输出]'}`
          );
        } else if (result.status === 'WA') {
          return session.send(
            `🔴【Wrong Answer - WA ❌】输出结果不一致！\n` +
            `⏱ 耗时: ${result.elapsedMs} ms | ⚡ 步数: ${result.steps} 步\n` +
            `🎯 期望输出:\n${result.diff?.expected}\n` +
            `📤 实际输出:\n${result.diff?.actual || '[空输出]'}`
          );
        } else if (result.status === 'TLE') {
          return session.send(
            `🟡【Time Limit Exceeded - TLE ⏳】执行超时/步数熔断！\n` +
            `超过设定的最大执行步数限制 (${config.maxSteps} 步)，可能存在死循环。\n` +
            `📤 熔断前已产生输出:\n${result.stdout.trim() || '[无输出]'}`
          );
        } else {
          return session.send(
            `🟣【Compile Error - CE ⚠️】语法或编译检查未通过：\n` +
            `${result.diff?.actual || '未知编译错误'}`
          );
        }
      } else {
        // 纯运行模式 (Run Mode)
        const result = runCode(code, stdin, config.maxSteps);

        if (result.status === 'SUCCESS') {
          return session.send(
            `✅【运行成功】程序正常退出 (Exit Code: ${result.exitCode})\n` +
            `⏱ 耗时: ${result.elapsedMs} ms | ⚡ 步数: ${result.steps} 步\n` +
            `📤 程序输出 (stdout):\n${result.stdout.trim() || '[空输出]'}`
          );
        } else if (result.status === 'TLE') {
          return session.send(
            `🟡【Time Limit Exceeded - TLE ⏳】执行步数超限 (${config.maxSteps} 步)！\n` +
            `📤 熔断前已产生输出:\n${result.stdout.trim() || '[无输出]'}`
          );
        } else {
          return session.send(
            `🟣【Compile Error - CE ⚠️】解析或编译失败：\n` +
            `${result.diff?.actual || '语法错误'}`
          );
        }
      }
    });

  // -----------------------------------------------------------------
  // 注册 cexample / ctpl 命令: 查看内置 5 套教学用例
  // -----------------------------------------------------------------
  ctx.command('cexample [index:number]', '📚 查看内置的 5 套 C++ 算法演示用例')
    .alias('ctpl')
    .action(async ({ session }, index) => {
      if (!session) return;
      if (!index) {
        const listText = PRESET_EXAMPLES.map((ex, i) => `${i + 1}. ${ex.title}`).join('\n');
        return session.send(`📚【内置算法教学与演示用例】\n${listText}\n\n👉 发送 "cexample <序号>" 获取完整代码与测试数据！`);
      }
      const target = PRESET_EXAMPLES[index - 1];
      if (!target) {
        return session.send(`⚠️ 未找到序号为 ${index} 的用例，请输入 1 ~ ${PRESET_EXAMPLES.length}`);
      }
      return session.send(
        `【${target.title}】\n` +
        `\`\`\`cpp\n${target.code}\n\`\`\`\n` +
        `📥 输入数据 (stdin):\n${target.stdin}\n` +
        `🎯 期望输出:\n${target.expected.trim()}`
      );
    });
}
