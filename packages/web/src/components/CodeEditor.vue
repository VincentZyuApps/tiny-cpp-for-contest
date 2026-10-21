<template>
  <div class="code-editor-root" ref="editorContainerRef"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { EditorView, basicSetup } from 'codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark, oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import { syntaxHighlighting } from '@codemirror/language';
import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, DecorationSet } from '@codemirror/view';

const props = defineProps<{
  modelValue: string;
  currentLine?: number;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
}>();

const editorContainerRef = ref<HTMLDivElement | null>(null);
let view: EditorView | null = null;

// 定义高亮当前执行行的 StateEffect 和 StateField
const setCurrentLineEffect = StateEffect.define<number>();

const currentLineField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setCurrentLineEffect)) {
        const lineNum = e.value;
        if (lineNum > 0 && lineNum <= tr.state.doc.lines) {
          const line = tr.state.doc.line(lineNum);
          const deco = Decoration.line({
            attributes: { class: 'cm-debug-active-line' },
          });
          return Decoration.set([deco.range(line.from)]);
        }
        return Decoration.none;
      }
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// 自定义样式主题，匹配 Cascadia Code 与深色 Slate 配色
const customTheme = EditorView.theme({
  '&': {
    height: '100%',
    width: '100%',
    fontSize: '13px',
    backgroundColor: '#020617',
    fontFamily:
      "'Cascadia Code Variable', 'Cascadia Code', 'LXGW WenKai', ui-monospace, Menlo, Monaco, Consolas, monospace",
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'inherit',
    lineHeight: '22px',
  },
  '.cm-content': {
    fontFamily: 'inherit',
    caretColor: '#38bdf8',
    padding: '8px 0',
  },
  '.cm-line': {
    padding: '0 12px',
  },
  '.cm-gutters': {
    backgroundColor: '#090d16',
    color: '#475569',
    borderRight: '1px solid #1e293b',
    fontFamily: "'Cascadia Code Variable', 'Cascadia Code', ui-monospace, monospace",
    paddingRight: '6px',
    userSelect: 'none',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(30, 41, 59, 0.35)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#1e293b',
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  '.cm-debug-active-line': {
    backgroundColor: 'rgba(56, 189, 248, 0.18) !important',
    borderLeft: '4px solid #38bdf8 !important',
    boxShadow: 'inset 0 0 8px rgba(56, 189, 248, 0.1)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
});

onMounted(() => {
  if (!editorContainerRef.value) return;

  view = new EditorView({
    doc: props.modelValue,
    extensions: [
      basicSetup,
      cpp(),
      oneDark,
      syntaxHighlighting(oneDarkHighlightStyle),
      customTheme,
      currentLineField,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newDoc = update.state.doc.toString();
          emit('update:modelValue', newDoc);
          emit('change', newDoc);
        }
      }),
    ],
    parent: editorContainerRef.value,
  });

  if (props.currentLine) {
    updateLineHighlight(props.currentLine);
  }
});

function updateLineHighlight(lineNum: number) {
  if (!view) return;
  view.dispatch({
    effects: setCurrentLineEffect.of(lineNum),
  });
  if (lineNum > 0 && lineNum <= view.state.doc.lines) {
    const line = view.state.doc.line(lineNum);
    view.dispatch({
      effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
    });
  }
}

watch(
  () => props.currentLine,
  (newLine) => {
    if (newLine !== undefined) {
      updateLineHighlight(newLine);
    }
  }
);

watch(
  () => props.modelValue,
  (newVal) => {
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== newVal) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: newVal },
      });
      if (props.currentLine) {
        updateLineHighlight(props.currentLine);
      }
    }
  }
);

onUnmounted(() => {
  if (view) {
    view.destroy();
    view = null;
  }
});
</script>

<style scoped>
.code-editor-root {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
}
</style>
