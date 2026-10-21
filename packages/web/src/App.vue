<template>
  <div class="app-root">
    <!-- 顶部导航栏 -->
    <header class="top-nav">
      <div class="brand">
        <span class="logo">⚡</span>
        <div class="brand-text">
          <h1>Tiny C++ for Contest</h1>
          <div class="subtitle-box">
            <span class="quote-line">“编译和解释没有绝对的界限，他们的界限是模糊的。”</span>
            <span class="author-line">—— 致敬南京大学 蒋炎岩 (jyy) 老师</span>
          </div>
        </div>
      </div>

      <!-- 模式切换与预置案例 -->
      <div class="top-actions">
        <!-- 预设案例选择器 -->
        <div class="select-group">
          <label>📚 预设教学案例:</label>
          <select v-model="selectedExampleId" @change="loadSelectedExample">
            <option v-for="ex in PRESET_EXAMPLES" :key="ex.id" :value="ex.id">
              {{ ex.title }}
            </option>
          </select>
        </div>

        <!-- 三种工作模式 -->
        <div class="mode-tabs">
          <button
            class="mode-btn"
            :class="{ active: currentMode === 'batch' }"
            @click="switchMode('batch')"
          >
            🚀 纯编译运行 (Batch)
          </button>
          <button
            class="mode-btn"
            :class="{ active: currentMode === 'stepper' }"
            @click="switchMode('stepper')"
          >
            🐞 步进调试 (Stepper)
          </button>
          <button
            class="mode-btn"
            :class="{ active: currentMode === 'repl' }"
            @click="switchMode('repl')"
          >
            ⚡ 动态解释 (REPL)
          </button>
        </div>

        <!-- 🔗 GitHub 源码跳转按钮 -->
        <a
          href="https://github.com/VincentZyuApps/tiny-cpp-for-contest"
          target="_blank"
          rel="noopener noreferrer"
          class="github-link-btn"
          title="访问 GitHub 源码仓库"
        >
          <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
          </svg>
          <span>GitHub</span>
        </a>
      </div>
    </header>

    <!-- 主操作区 (双栏布局) -->
    <main class="main-body">
      <!-- 左栏: 代码编辑区 (带当前执行行指示) -->
      <section class="editor-section">
        <div class="panel-header">
          <span>📝 C++ 源码编辑器 (Contest Subset)</span>
          <span class="status-indicator">当前行: L{{ currentLine || 1 }}</span>
        </div>
        <div class="editor-container">
          <CodeEditor
            v-model="sourceCode"
            :current-line="currentLine"
            @change="onCodeChange"
          />
        </div>
      </section>

      <!-- 右栏: 控制器、变量观察器与标准 I/O -->
      <section class="side-section">
        <!-- 调试控制栏 (播放器 + 导航) -->
        <div class="control-panel">
          <div class="control-actions">
            <!-- 单步微调组 -->
            <div class="btn-group">
              <button class="btn btn-secondary" title="上一行 (时间旅行回退)" @click="handlePrevLine">
                ⏮ 上行
              </button>
              <button class="btn btn-primary" title="下一行 (Step Over)" @click="handleNextLine">
                ⏭ 下行
              </button>
              <button class="btn btn-secondary" title="上一步微步" @click="handlePrevStep">
                ⏪ 上步
              </button>
              <button class="btn btn-primary" title="下一步微步" @click="handleNextStep">
                ⏩ 下步
              </button>
            </div>

            <!-- 连续播放与三档调速胶囊 -->
            <div class="play-group">
              <button
                class="btn"
                :class="isPlaying ? 'btn-warning' : 'btn-success'"
                :title="isPlaying ? '暂停自动播放' : '以指定间隔自动步进执行'"
                @click="togglePlay"
              >
                {{ isPlaying ? '⏸ 暂停' : '▶ 播放' }}
              </button>

              <!-- 三档调速分段按钮 (最慢 / 推荐 / 最快) -->
              <div class="speed-presets">
                <button
                  class="speed-btn"
                  :class="{ active: Math.abs(stepSpeed - 2.0) < 0.05 }"
                  title="最慢速度 (2.0s / 步，从容精读)"
                  @click="setSpeed(2.0)"
                >
                  🐢 2.0s
                </button>
                <button
                  class="speed-btn"
                  :class="{ active: Math.abs(stepSpeed - 1.0) < 0.05 }"
                  title="推荐速度 (1.0s / 步，标准心智节奏)"
                  @click="setSpeed(1.0)"
                >
                  🎯 1.0s
                </button>
                <button
                  class="speed-btn"
                  :class="{ active: Math.abs(stepSpeed - 0.1) < 0.05 }"
                  title="最快速度 (0.1s / 步，极速巡航到底)"
                  @click="setSpeed(0.1)"
                >
                  ⚡ 0.1s
                </button>
              </div>

              <button class="btn btn-danger" title="重置状态机" @click="handleReset">
                🔄 重置
              </button>
            </div>
          </div>

          <!-- 评测状态指标 -->
          <div class="stats-bar">
            <span>步数: <strong>{{ executedSteps }}</strong></span>
            <span>耗时: <strong>{{ elapsedMs }}ms</strong></span>
            <span v-if="judgeStatus" class="status-badge" :class="judgeStatus.toLowerCase()">
              {{ judgeStatus }}
            </span>
          </div>
        </div>

        <!-- 变量作用域监视器 (Scope Watcher) -->
        <div class="scope-panel">
          <div class="panel-header">
            <span>🔍 作用域变量监视 (Scope Watcher)</span>
            <span class="count-badge">{{ Object.keys(currentScope).length }} 变量</span>
          </div>
          <div class="scope-content">
            <table v-if="Object.keys(currentScope).length > 0" class="scope-table">
              <thead>
                <tr>
                  <th>变量名</th>
                  <th>类型 / 结构</th>
                  <th>当前值</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(val, key) in currentScope" :key="key">
                  <td class="mono var-key">{{ key }}</td>
                  <td class="var-type">{{ formatType(val) }}</td>
                  <td class="mono var-val">{{ formatValue(val) }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="empty-scope">环境为空或尚未初始化</div>
          </div>
        </div>

        <!-- 标准输入输出 (I/O 流) -->
        <div class="io-panel">
          <div class="io-half">
            <div class="panel-header">
              <span>📥 标准输入 (stdin)</span>
            </div>
            <textarea
              class="io-textarea"
              v-model="stdinText"
              placeholder="输入数据 (以空格或换行分隔)..."
            ></textarea>
          </div>
          <div class="io-half">
            <div class="panel-header">
              <span>📤 标准输出 (stdout)</span>
            </div>
            <pre class="stdout-terminal">{{ stdoutBuffer || '[暂无输出]' }}</pre>
          </div>
        </div>
      </section>
    </main>

    <!-- 底部: 📊 jyy 状态机图模型 -->
    <footer class="bottom-graph">
      <StateMachineGraph
        :graph="stateGraph"
        :active-node-id="activeNodeId"
        @select-node="onSelectNode"
        @select-line="onSelectLine"
      />
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import {
  PRESET_EXAMPLES,
  createVM,
  runCode,
  judgeCode,
  VirtualMachine,
  HostVector,
  HostString,
  HostPair,
  HostQueue,
  HostStack,
  HostPriorityQueue,
} from 'tiny-cpp-for-contest-core';
import StateMachineGraph from './components/StateMachineGraph.vue';
import CodeEditor from './components/CodeEditor.vue';

// 模式
type RunMode = 'batch' | 'stepper' | 'repl';
const currentMode = ref<RunMode>('stepper');

// 案例
const selectedExampleId = ref('gcd-statemachine');
const sourceCode = ref('');
const stdinText = ref('');
const expectedStdout = ref('');

// 虚拟机状态
let vm: VirtualMachine | null = null;
const currentLine = ref(1);
const currentScope = ref<Record<string, any>>({});
const stdoutBuffer = ref('');
const executedSteps = ref(0);
const elapsedMs = ref(0);
const judgeStatus = ref<string | null>(null);

// 状态机图数据
const stateGraph = ref<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
const activeNodeId = ref<string>('');

// 自动播放连续步进
const isPlaying = ref(false);
const stepSpeed = ref(1.0); // 默认 1.0s 间隔
let playTimer: any = null;

// 载入预设案例
function loadSelectedExample() {
  const ex = PRESET_EXAMPLES.find((e) => e.id === selectedExampleId.value);
  if (ex) {
    sourceCode.value = ex.code;
    stdinText.value = ex.stdin;
    expectedStdout.value = ex.expected;
    handleReset();
  }
}

function onCodeChange() {
  handleReset();
}

function switchMode(mode: RunMode) {
  currentMode.value = mode;
  handleReset();
  if (mode === 'batch') {
    handleRunAll();
  }
}

function handleReset() {
  stopPlay();
  try {
    vm = createVM(sourceCode.value, stdinText.value);
    const snap = vm.step(); // 步入第一条语句前
    currentLine.value = snap.line;
    currentScope.value = snap.scope;
    stdoutBuffer.value = snap.stdout;
    executedSteps.value = snap.stepIndex;
    elapsedMs.value = 0;
    judgeStatus.value = null;

    updateGraph();
  } catch (err: any) {
    judgeStatus.value = 'CE';
    stdoutBuffer.value = String(err?.message || err);
  }
}

function stopPlay() {
  if (playTimer) {
    clearInterval(playTimer);
    playTimer = null;
  }
  isPlaying.value = false;
}

function startPlay() {
  stopPlay();
  if (!vm) handleReset();
  isPlaying.value = true;

  const intervalMs = Math.max(50, Math.round(stepSpeed.value * 1000));
  playTimer = setInterval(() => {
    const hasMore = handleNextLine();
    if (!hasMore) {
      stopPlay();
    }
  }, intervalMs);
}

function setSpeed(speed: number) {
  stepSpeed.value = speed;
}

function togglePlay() {
  if (isPlaying.value) {
    stopPlay();
  } else {
    startPlay();
  }
}

watch(stepSpeed, () => {
  if (isPlaying.value) {
    startPlay();
  }
});

onUnmounted(() => {
  stopPlay();
});

function updateGraph() {
  if (vm) {
    stateGraph.value = vm.getTraceGraph();
    const lastNode = stateGraph.value.nodes[stateGraph.value.nodes.length - 1];
    activeNodeId.value = lastNode?.id || '';
  }
}

// 四键天王调试动作
function handleNextStep() {
  if (!vm) handleReset();
  if (!vm) return;

  const snap = vm.step();
  currentLine.value = snap.line;
  currentScope.value = snap.scope;
  stdoutBuffer.value = snap.stdout;
  executedSteps.value = snap.stepIndex;

  updateGraph();
}

function handlePrevStep() {
  if (!vm) return;
  const snap = vm.stepPrev();
  if (snap) {
    currentLine.value = snap.line;
    currentScope.value = snap.scope;
    stdoutBuffer.value = snap.stdout;
    executedSteps.value = snap.stepIndex;
    updateGraph();
  }
}

function handleNextLine(): boolean {
  if (!vm) handleReset();
  if (!vm) return false;

  const startLine = currentLine.value;
  let isDone = false;
  // 一直单步，直到行号发生变化或程序结束
  for (let i = 0; i < 50; i++) {
    const snap = vm.step();
    currentLine.value = snap.line;
    currentScope.value = snap.scope;
    stdoutBuffer.value = snap.stdout;
    executedSteps.value = snap.stepIndex;
    if (snap.done) {
      isDone = true;
      break;
    }
    if (snap.line !== startLine) break;
  }
  updateGraph();
  return !isDone;
}

function handlePrevLine() {
  if (!vm) return;
  const startLine = currentLine.value;
  for (let i = 0; i < 50; i++) {
    const snap = vm.stepPrev();
    if (!snap) break;
    currentLine.value = snap.line;
    currentScope.value = snap.scope;
    stdoutBuffer.value = snap.stdout;
    executedSteps.value = snap.stepIndex;
    if (snap.line !== startLine) break;
  }
  updateGraph();
}

function handleRunAll() {
  stopPlay();
  const startTime = Date.now();
  if (expectedStdout.value && expectedStdout.value.trim() !== '-') {
    const res = judgeCode(sourceCode.value, stdinText.value, expectedStdout.value);
    stdoutBuffer.value = res.stdout;
    executedSteps.value = res.steps;
    elapsedMs.value = res.elapsedMs;
    judgeStatus.value = res.status;
    if (res.graph) {
      stateGraph.value = res.graph;
      activeNodeId.value = res.graph.nodes[res.graph.nodes.length - 1]?.id || '';
    }
  } else {
    const res = runCode(sourceCode.value, stdinText.value);
    stdoutBuffer.value = res.stdout;
    executedSteps.value = res.steps;
    elapsedMs.value = res.elapsedMs;
    judgeStatus.value = res.status;
    if (res.graph) {
      stateGraph.value = res.graph;
      activeNodeId.value = res.graph.nodes[res.graph.nodes.length - 1]?.id || '';
    }
  }
}

function onSelectNode(node: any) {
  currentLine.value = node.line;
  currentScope.value = node.variables;
  activeNodeId.value = node.id;
}

function onSelectLine(line: number) {
  if (line > 0) {
    currentLine.value = line;
  }
}

function formatType(val: any): string {
  if (val instanceof HostVector) return `vector (${val.size()})`;
  if (val instanceof HostPair) return `pair<T, T>`;
  if (val instanceof HostString) return `string`;
  if (val instanceof HostQueue) return `queue (${val.size()})`;
  if (val instanceof HostStack) return `stack (${val.size()})`;
  if (val instanceof HostPriorityQueue) return `priority_queue (${val.size()})`;
  if (Array.isArray(val)) return `Array[${val.length}]`;
  return typeof val;
}

function formatValue(val: any): string {
  if (val instanceof HostVector) {
    const slice = val.data.slice(0, 5).join(', ');
    return `[${slice}${val.size() > 5 ? '...' : ''}]`;
  }
  if (val instanceof HostQueue) {
    return `front: ${val.empty() ? 'empty' : val.front()} (len ${val.size()})`;
  }
  if (val instanceof HostStack) {
    return `top: ${val.empty() ? 'empty' : val.top()} (len ${val.size()})`;
  }
  if (val instanceof HostPriorityQueue) {
    return `top: ${val.empty() ? 'empty' : val.top()} (len ${val.size()})`;
  }
  if (val instanceof HostPair) {
    return `{ first: ${val.first}, second: ${val.second} }`;
  }
  if (val instanceof HostString) {
    return `"${val.data}"`;
  }
  if (Array.isArray(val)) {
    return `[${val.slice(0, 5).join(', ')}${val.length > 5 ? '...' : ''}]`;
  }
  return String(val);
}

onMounted(() => {
  loadSelectedExample();
});
</script>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0b1120;
}

/* 顶部导航 */
.top-nav {
  position: relative;
  z-index: 20;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background: #0f172a;
  border-bottom: 1px solid #334155;
  box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.55), 0 2px 4px -1px rgba(0, 0, 0, 0.4);
}

.top-nav::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    rgba(56, 189, 248, 0.5) 0%,
    rgba(74, 222, 128, 0.3) 30%,
    rgba(30, 41, 59, 0.2) 70%,
    transparent 100%
  );
  pointer-events: none;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand .logo {
  font-size: 28px;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand h1 {
  font-size: 16px;
  font-weight: 700;
  color: #f8fafc;
}

.subtitle-box {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 2px;
}

.quote-line {
  font-size: 11px;
  color: #38bdf8;
  font-style: italic;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

.author-line {
  font-size: 10px;
  color: #94a3b8;
  align-self: flex-end;
  opacity: 0.85;
  white-space: nowrap;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.select-group {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #cbd5e1;
}

.select-group select {
  background: #1e293b;
  color: #f8fafc;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 6px 12px;
  outline: none;
  cursor: pointer;
}

.mode-tabs {
  display: flex;
  background: #1e293b;
  border-radius: 6px;
  padding: 2px;
}

.mode-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn.active {
  background: #3b82f6;
  color: #ffffff;
  font-weight: bold;
}

.github-link-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #1e293b;
  color: #f8fafc;
  text-decoration: none;
  font-size: 12px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #334155;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.github-link-btn:hover {
  background: #334155;
  border-color: #38bdf8;
  color: #38bdf8;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.25);
  transform: translateY(-1px);
}

/* 主操作区 */
.main-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.editor-section {
  flex: 1.2;
  border-right: 1px solid #1e293b;
  display: flex;
  flex-direction: column;
}

.side-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #090d16;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 14px;
  background: #131d31;
  border-bottom: 1px solid #1e293b;
  font-size: 12px;
  color: #94a3b8;
}

.editor-container {
  display: flex;
  flex: 1;
  background: #020617;
  overflow: hidden;
}

/* 控制面板 */
.control-panel {
  padding: 8px 12px;
  background: #0f172a;
  border-bottom: 1px solid #1e293b;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.control-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-group {
  display: flex;
  gap: 4px;
  align-items: center;
}

.play-group {
  display: flex;
  gap: 6px;
  align-items: center;
  background: #090d16;
  padding: 3px 6px;
  border-radius: 6px;
  border: 1px solid #1e293b;
}

.btn {
  padding: 5px 8px;
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
  user-select: none;
}

.btn-primary { background: #2563eb; color: #fff; }
.btn-primary:hover { background: #1d4ed8; }
.btn-secondary { background: #334155; color: #cbd5e1; }
.btn-secondary:hover { background: #475569; }
.btn-success { background: #16a34a; color: #fff; }
.btn-success:hover { background: #15803d; }
.btn-warning { background: #d97706; color: #fff; }
.btn-warning:hover { background: #b45309; }
.btn-danger { background: #dc2626; color: #fff; }
.btn-danger:hover { background: #b91c1c; }

.speed-presets {
  display: flex;
  background: #020617;
  border-radius: 4px;
  border: 1px solid #1e293b;
  overflow: hidden;
}

.speed-btn {
  padding: 4px 7px;
  font-size: 11px;
  background: transparent;
  color: #94a3b8;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  user-select: none;
}

.speed-btn:hover {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.08);
}

.speed-btn.active {
  background: #0284c7;
  color: #ffffff;
  font-weight: 700;
}

.stats-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #94a3b8;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 11px;
}

.status-badge.ac { background: #16a34a; color: #fff; }
.status-badge.wa { background: #dc2626; color: #fff; }
.status-badge.tle { background: #ca8a04; color: #fff; }
.status-badge.ce { background: #9333ea; color: #fff; }
.status-badge.re { background: #ea580c; color: #fff; }

/* 变量监视器 */
.scope-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #1e293b;
  overflow: hidden;
}

.scope-content {
  flex: 1;
  overflow-y: auto;
  padding: 6px 12px;
  background: #020617;
}

.scope-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.scope-table th {
  text-align: left;
  color: #64748b;
  padding: 4px 6px;
  border-bottom: 1px solid #1e293b;
}

.scope-table td {
  padding: 4px 6px;
  border-bottom: 1px solid #0f172a;
}

.var-key { color: #38bdf8; font-weight: bold; }
.var-type { color: #a5b4fc; }
.var-val { color: #4ade80; }

.empty-scope {
  color: #475569;
  font-size: 12px;
  text-align: center;
  padding: 20px;
}

/* I/O 面板 */
.io-panel {
  height: 160px;
  display: flex;
  border-top: 1px solid #1e293b;
}

.io-half {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.io-half:first-child {
  border-right: 1px solid #1e293b;
}

.io-textarea {
  flex: 1;
  background: #020617;
  color: #cbd5e1;
  border: none;
  outline: none;
  padding: 6px 10px;
  font-size: 12px;
  font-family: inherit;
  resize: none;
}

.stdout-terminal {
  flex: 1;
  background: #000000;
  color: #4ade80;
  padding: 6px 10px;
  font-size: 12px;
  overflow-y: auto;
  white-space: pre-wrap;
}

/* 底部状态机 */
.bottom-graph {
  border-top: 1px solid #1e293b;
}
</style>
