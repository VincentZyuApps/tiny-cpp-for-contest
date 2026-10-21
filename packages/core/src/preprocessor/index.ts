/**
 * packages/core/src/preprocessor/index.ts
 * 竞赛代码轻量预处理器：清洗头文件、抹平 using namespace std、处理基础宏替换
 */

export function preprocessCode(rawCode: string): string {
  const lines = rawCode.split(/\r?\n/);
  const macroMap = new Map<string, string>();
  const processedLines: string[] = [];

  for (let line of lines) {
    const trimmed = line.trim();

    // 1. 过滤 #include
    if (trimmed.startsWith('#include')) {
      // 保持原始行号对应，用空行占位
      processedLines.push('');
      continue;
    }

    // 2. 处理简单单行 #define NAME VALUE
    // 例如: #define int long long
    // 例如: #define rep(i, a, b) ... (暂且支持简单 token 替换)
    if (trimmed.startsWith('#define')) {
      const match = trimmed.match(/^#define\s+([A-Za-z_]\w*)\s+(.+)$/);
      if (match) {
        const name = match[1];
        const val = match[2].trim();
        // 如果是 #define int long long，先记录下来
        macroMap.set(name, val);
      }
      processedLines.push('');
      continue;
    }

    // 3. 过滤 using namespace std;
    if (trimmed.startsWith('using namespace std;')) {
      processedLines.push('');
      continue;
    }

    // 4. 过滤 cin.tie / sync_with_stdio
    if (
      trimmed.includes('sync_with_stdio') ||
      trimmed.includes('cin.tie') ||
      trimmed.includes('cout.tie')
    ) {
      processedLines.push('');
      continue;
    }

    // 5. 应用已注册的简单宏替换 (单词边界匹配)
    let curLine = line;
    for (const [name, val] of macroMap.entries()) {
      const regex = new RegExp(`\\b${name}\\b`, 'g');
      curLine = curLine.replace(regex, val);
    }

    processedLines.push(curLine);
  }

  return processedLines.join('\n');
}
