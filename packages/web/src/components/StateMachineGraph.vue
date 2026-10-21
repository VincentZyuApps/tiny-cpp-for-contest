<template>
  <div class="state-machine-container">
    <div class="sm-header">
      <div class="sm-title">
        <span class="icon">📊</span>
        <strong>jyy 状态机模型 (State Machine Mode)</strong>
        <span class="jyy-quote">“程序不过是一个状态机。 —— 致敬南京大学 蒋炎岩 (jyy) 老师”</span>
      </div>
      <div class="sm-controls">
        <label class="slider-label">
          窗口追踪 (最近 {{ windowSize }} 步):
          <input
            type="range"
            min="10"
            max="80"
            step="5"
            v-model.number="windowSize"
          />
        </label>
        <span class="badge">总状态节点: {{ graph.nodes.length }}</span>
      </div>
    </div>

    <!-- 状态机画布 -->
    <div class="sm-canvas-wrapper" ref="canvasWrapper">
      <svg
        v-if="displayNodes.length > 0"
        class="sm-svg"
        :width="svgWidth"
        :height="svgHeight"
      >
        <defs>
          <!-- 箭头标记 -->
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#38bdf8" />
          </marker>
          <!-- 高亮箭头 -->
          <marker
            id="arrowhead-active"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#4ade80" />
          </marker>
        </defs>

        <!-- 连线 (Edges) -->
        <g
          v-for="edge in displayEdges"
          :key="edge.id"
          class="edge-group"
          @click="$emit('select-line', getEdgeLine(edge))"
        >
          <line
            :x1="getNodeX(edge.source)"
            :y1="getNodeY(edge.source)"
            :x2="getNodeX(edge.target)"
            :y2="getNodeY(edge.target)"
            :stroke="isEdgeActive(edge) ? '#4ade80' : '#334155'"
            :stroke-width="isEdgeActive(edge) ? '3' : '1.5'"
            :marker-end="isEdgeActive(edge) ? 'url(#arrowhead-active)' : 'url(#arrowhead)'"
            :stroke-dasharray="isEdgeActive(edge) ? '4 2' : 'none'"
            class="transition-edge"
          />
          <!-- 边上的动作文字: 显示精简行号，悬浮显示完整代码细节 -->
          <text
            :x="(getNodeX(edge.source) + getNodeX(edge.target)) / 2"
            :y="(getNodeY(edge.source) + getNodeY(edge.target)) / 2 - 12"
            fill="#94a3b8"
            font-size="11"
            text-anchor="middle"
            class="edge-label"
          >
            {{ getEdgeLabel(edge) }}
            <title>{{ getEdgeTooltip(edge) }}</title>
          </text>
        </g>

        <!-- 节点 (Nodes) -->
        <g
          v-for="node in displayNodes"
          :key="node.id"
          :transform="`translate(${node.x}, ${node.y})`"
          class="state-node"
          :class="{ active: node.id === activeNodeId }"
          @click="$emit('select-node', node)"
        >
          <!-- 节点背景圆环/呼吸灯 -->
          <circle
            r="28"
            :fill="node.id === activeNodeId ? '#065f46' : '#1e293b'"
            :stroke="node.id === activeNodeId ? '#4ade80' : '#475569'"
            stroke-width="2"
            class="node-circle"
          />
          <!-- 节点名称 (S_step) -->
          <text
            dy="-4"
            fill="#f8fafc"
            font-weight="bold"
            font-size="12"
            text-anchor="middle"
          >
            S{{ node.stepIndex }}
          </text>
          <!-- 行号 -->
          <text
            dy="12"
            fill="#94a3b8"
            font-size="10"
            text-anchor="middle"
          >
            L{{ node.line }}
          </text>
        </g>
      </svg>

      <div v-else class="empty-hint">
        🚀 暂无状态机轨迹，点击上方“单步调试”或“运行”以动态生成状态转移！
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  graph: {
    nodes: any[];
    edges: any[];
  };
  activeNodeId?: string;
}>();

defineEmits(['select-node', 'select-line']);

const windowSize = ref(30);

// 带有坐标布局计算的节点列表
const displayNodes = computed(() => {
  const nodes = props.graph.nodes || [];
  const sliced = nodes.slice(-windowSize.value);

  const startX = 60;
  const gapX = 140;
  const centerY = 110;

  return sliced.map((n, idx) => ({
    ...n,
    x: startX + idx * gapX,
    y: centerY + (idx % 2 === 0 ? 0 : 15), // 微幅错落美化
  }));
});

const nodePosMap = computed(() => {
  const map = new Map<string, { x: number; y: number }>();
  for (const n of displayNodes.value) {
    map.set(n.id, { x: n.x, y: n.y });
  }
  return map;
});

const displayEdges = computed(() => {
  const edges = props.graph.edges || [];
  const validIds = new Set(displayNodes.value.map((n) => n.id));
  return edges.filter((e) => validIds.has(e.source) && validIds.has(e.target));
});

const svgWidth = computed(() => {
  return Math.max(800, displayNodes.value.length * 150 + 100);
});

const svgHeight = computed(() => 220);

function getNodeX(id: string): number {
  return nodePosMap.value.get(id)?.x || 0;
}

function getNodeY(id: string): number {
  return nodePosMap.value.get(id)?.y || 0;
}

function isEdgeActive(edge: any): boolean {
  return edge.target === props.activeNodeId;
}

function getEdgeLine(edge: any): number {
  if (edge.line) return edge.line;
  const targetNode = props.graph.nodes?.find((n) => n.id === edge.target);
  return targetNode?.line || 0;
}

function getEdgeLabel(edge: any): string {
  const line = getEdgeLine(edge);
  return line ? `Line ${line}` : 'Step';
}

function getEdgeTooltip(edge: any): string {
  const line = getEdgeLine(edge);
  const prefix = line ? `[第 ${line} 行] ` : '';
  return `${prefix}${edge.action || '状态转移'}`;
}
</script>

<style scoped>
.state-machine-container {
  background: #090d16;
  border-top: 1px solid #1e293b;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
}

.sm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.sm-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.jyy-quote {
  font-size: 12px;
  color: #38bdf8;
  font-style: italic;
  margin-left: 12px;
}

.sm-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
}

.slider-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #94a3b8;
}

.badge {
  background: #1e293b;
  padding: 2px 8px;
  border-radius: 4px;
  color: #a5b4fc;
}

.sm-canvas-wrapper {
  overflow-x: auto;
  min-height: 180px;
  background: #020617;
  border-radius: 8px;
  border: 1px dashed #1e293b;
  display: flex;
  align-items: center;
}

.sm-svg {
  display: block;
}

.state-node {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.state-node:hover .node-circle {
  stroke: #38bdf8;
  stroke-width: 3;
}

.state-node.active .node-circle {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    r: 28;
    filter: drop-shadow(0 0 2px #4ade80);
  }
  50% {
    r: 32;
    filter: drop-shadow(0 0 10px #4ade80);
  }
  100% {
    r: 28;
    filter: drop-shadow(0 0 2px #4ade80);
  }
}

.edge-group {
  cursor: pointer;
}

.edge-group:hover line {
  stroke: #38bdf8 !important;
  stroke-width: 2.5 !important;
}

.edge-group:hover text {
  fill: #38bdf8 !important;
  font-weight: bold;
}

.edge-label {
  user-select: none;
  background: #090d16;
  transition: fill 0.2s ease;
}

.sm-canvas-wrapper svg text {
  font-family: 'Cascadia Code Variable', 'Cascadia Code', 'LXGW WenKai', ui-monospace, monospace;
}

.empty-hint {
  width: 100%;
  text-align: center;
  color: #64748b;
  font-size: 13px;
  padding: 40px 0;
}
</style>
