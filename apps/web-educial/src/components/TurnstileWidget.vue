<script lang="ts" setup>
import { onMounted, ref } from 'vue';

interface Turnstile {
  remove: (id: string) => void;
  render: (el: HTMLElement, opts: Record<string, any>) => string;
  reset: (id: string) => void;
}

interface Props {
  modelValue?: string;
}

withDefaults(defineProps<Props>(), {
  modelValue: '',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const widgetId = ref('');
const containerRef = ref<HTMLDivElement>();

function getTurnstile(): Turnstile | undefined {
  return (window as any).turnstile;
}

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve) => {
    if (getTurnstile()) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => resolve());
    document.head.append(script);
  });
}

async function renderWidget() {
  await loadTurnstileScript();
  const ts = getTurnstile();
  if (!containerRef.value || !ts) return;

  if (widgetId.value) {
    ts.remove(widgetId.value);
  }

  widgetId.value = ts.render(containerRef.value, {
    callback: (token: string) => emit('update:modelValue', token),
    'error-callback': () => emit('update:modelValue', ''),
    'expired-callback': () => emit('update:modelValue', ''),
    sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY || '',
  });
}

function reset() {
  emit('update:modelValue', '');
  const ts = getTurnstile();
  if (widgetId.value && ts) {
    ts.reset(widgetId.value);
  }
}

onMounted(() => {
  renderWidget();
});

defineExpose({ reset });
</script>

<template>
  <div ref="containerRef" class="flex justify-center"></div>
</template>
