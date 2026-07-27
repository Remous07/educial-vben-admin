<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    siteKey: string;
    size?: 'compact' | 'normal';
  }>(),
  { size: 'normal' },
);

const emit = defineEmits<{
  error: [];
  expired: [];
  verified: [token: string];
}>();

const containerRef = ref<HTMLElement>();
const widgetId = ref<string>('');
let scriptLoaded = false;

async function loadScript(): Promise<void> {
  if (scriptLoaded) return;
  return new Promise((resolve) => {
    if (window.turnstile) {
      scriptLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => {
      scriptLoaded = true;
      resolve();
    });
    document.head.append(script);
  });
}

async function renderWidget() {
  if (!containerRef.value) return;
  await loadScript();
  if (widgetId.value) {
    window.turnstile?.remove(widgetId.value);
  }
  widgetId.value =
    window.turnstile?.render(containerRef.value, {
      action: 'login',
      cData: '',
      callback: (token: string) => emit('verified', token),
      'error-callback': () => emit('error'),
      'expired-callback': () => {
        emit('expired');
        window.turnstile?.reset(widgetId.value);
      },
      sitekey: props.siteKey,
      size: props.size,
      theme: 'auto',
    }) ?? '';
}

function reset() {
  if (widgetId.value) {
    window.turnstile?.reset(widgetId.value);
  }
}

onMounted(renderWidget);
onUnmounted(() => {
  if (widgetId.value) {
    window.turnstile?.remove(widgetId.value);
  }
});

defineExpose({ reset });
</script>

<template>
  <div ref="containerRef" class="turnstile-container"></div>
</template>

<style scoped>
.turnstile-container {
  min-height: 65px;
}
</style>
