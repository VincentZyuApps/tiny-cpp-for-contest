#!/usr/bin/env node
/**
 * scripts/build_presets.js - Node.js 版预设代码生成器
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const presetsDir = path.join(repoRoot, 'packages', 'core', 'presets');
const examplesJsonPath = path.join(presetsDir, 'examples.json');
const outputTsPath = path.join(repoRoot, 'packages', 'core', 'src', 'presets.generated.ts');

if (!fs.existsSync(examplesJsonPath)) {
  console.error(`未找到案例配置文件: ${examplesJsonPath}`);
  process.exit(1);
}

const metaList = JSON.parse(fs.readFileSync(examplesJsonPath, 'utf-8'));
const presets = [];

for (const item of metaList) {
  const cppFile = path.join(presetsDir, item.file);
  if (!fs.existsSync(cppFile)) {
    console.error(`未找到 C++ 源码文件: ${cppFile}`);
    process.exit(1);
  }

  const cppContent = fs.readFileSync(cppFile, 'utf-8').replace(/\r\n/g, '\n');
  presets.push({
    id: item.id,
    title: item.title,
    code: cppContent,
    stdin: item.stdin || '',
    expected: item.expected || '',
  });
}

const tsContent = [
  '/**',
  ' * packages/core/src/presets.generated.ts',
  ' * ⚠️ 本文件由 scripts/build_presets.js 自动从 packages/core/presets/ 生成，请勿手动编辑！',
  ' */',
  '',
  'export interface PresetExample {',
  '  id: string;',
  '  title: string;',
  '  code: string;',
  '  stdin: string;',
  '  expected: string;',
  '}',
  '',
  `export const PRESET_EXAMPLES: PresetExample[] = ${JSON.stringify(presets, null, 2)};`,
  '',
].join('\n');

fs.writeFileSync(outputTsPath, tsContent, 'utf-8');
console.log(`✨ [生成成功] 成功生成预置案例至: ${outputTsPath} (共 ${presets.length} 套案例)`);
